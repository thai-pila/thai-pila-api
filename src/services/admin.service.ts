import pool from './db';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { PoolClient } from 'pg';

const jwtSecret = process.env.JWT_SECRET;

type CreateAdminPayload = {
    username: string;
    password: string;
    firstname: string;
    lastname: string;
    email: string;
    role?: string;
};

type UpdateAdminPayload = {
    firstname?: string;
    lastname?: string;
    role?: string;
    email?: string;
};

export async function createAdmin(payload: CreateAdminPayload) {
    const { username, password, firstname, lastname, email, role = 'super_admin' } = payload;
    const hashedPassword = await bcrypt.hash(password, 10);
    const uuid = uuidv4();

    let client: PoolClient | null = null;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        const authenResult = await client.query(
            `INSERT INTO authen (username, password) VALUES ($1, $2) RETURNING id`,
            [username, hashedPassword]
        );

        const adminId = authenResult.rows[0].id;
        const adminResult = await client.query(
            `INSERT INTO admin (id, uuid, firstname, lastname, role, email) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, uuid`,
            [adminId, uuid, firstname, lastname, role, email]
        );

        await client.query('COMMIT');

        return {
            success: true,
            adminId: adminResult.rows[0].id,
            uuid: adminResult.rows[0].uuid
        };
    } catch (error: any) {
        if (client) {
            await client.query('ROLLBACK');
        }

        if (error.code === '23505') {
            if (error.constraint?.includes('authen_username')) {
                throw new Error('Username already exists');
            }
            if (error.constraint?.includes('admin_email')) {
                throw new Error('Email already exists');
            }
            throw new Error('Duplicate data found');
        }

        throw new Error(error.message || 'Failed to create admin');
    } finally {
        client?.release();
    }
}

export async function loginAdmin(username: string, password: string) {
    try {
        const result = await pool.query(
            `SELECT 
                a.id,
                a.username,
                a.password,
                ad.uuid,
                ad.role,
                ad.firstname,
                ad.lastname,
                ad.email
            FROM authen a
            INNER JOIN admin ad ON ad.id = a.id
            WHERE a.username = $1
              AND a.delete_at IS NULL
              AND ad.delete_at IS NULL`,
            [username]
        );
        
        const admin = result.rows[0];
        if (!admin) throw new Error('Invalid username or password');

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) throw new Error('Invalid username or password');

        if (!jwtSecret) {
            console.error('CRITICAL: JWT_SECRET is missing in environment variables');
            throw new Error('Internal server error');
        }

        await pool.query(
            `UPDATE authen SET last_active_at = CURRENT_TIMESTAMP, update_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [admin.id]
        );

        const token = jwt.sign(
            { 
                sub: admin.uuid,
                id: admin.id, 
                username: admin.username, 
                role: admin.role 
            },
            jwtSecret,
            { expiresIn: '24h' }
        );

        return { 
            token, 
            role: admin.role, 
            adminId: admin.id, 
            uuid: admin.uuid,
            firstname: admin.firstname,
            lastname: admin.lastname,
            email: admin.email
        };
    } catch (error: any) {
        throw new Error(error.message || 'Login failed');
    }
}

export async function getAllAdmin() {
    try {
        const result = await pool.query(
            `SELECT 
                ad.id,
                ad.uuid,
                ad.firstname,
                ad.lastname,
                ad.role,
                ad.email,
                a.last_active_at
            FROM admin ad
            INNER JOIN authen a ON a.id = ad.id
            WHERE ad.delete_at IS NULL
              AND a.delete_at IS NULL
              ORDER BY ad.id DESC`
        );
        return result.rows;
    } catch (error: any) {
        throw new Error(error.message || 'Failed to retrieve admins');
    }
}

export async function getAdminById(adminId: number) {
    try {
        const result = await pool.query(
            `SELECT 
                ad.id,
                ad.uuid,
                ad.firstname,
                ad.lastname,
                ad.role,
                ad.email,
                a.last_active_at
            FROM admin ad
            INNER JOIN authen a ON a.id = ad.id
            WHERE ad.id = $1
              AND ad.delete_at IS NULL
                AND a.delete_at IS NULL`,
            [adminId]
        );
        return result.rows[0];
    } catch (error: any) {
        throw new Error(error.message || 'Failed to retrieve admin');
    }
}

export async function updateAdmin(adminId: number, payload: UpdateAdminPayload) {
    const fields: string[] = [];
    const values: Array<string | number> = [];

    if (payload.firstname !== undefined) {
        fields.push(`firstname = $${fields.length + 1}`);
        values.push(payload.firstname);
    }
    if (payload.lastname !== undefined) {
        fields.push(`lastname = $${fields.length + 1}`);
        values.push(payload.lastname);
    }
    if (payload.role !== undefined) {
        fields.push(`role = $${fields.length + 1}`);
        values.push(payload.role);
    }
    if (payload.email !== undefined) {
        fields.push(`email = $${fields.length + 1}`);
        values.push(payload.email);
    }

    if (fields.length === 0) {
        throw new Error('No updatable fields provided');
    }

    fields.push(`update_at = CURRENT_TIMESTAMP`);
    values.push(adminId);

    try {
        const result = await pool.query(
            `UPDATE admin
             SET ${fields.join(', ')}
             WHERE id = $${values.length} AND delete_at IS NULL
             RETURNING id, uuid, firstname, lastname, role, email, update_at`,
            values
        );

        return result.rows[0];
    } catch (error: any) {
        if (error.code === '23505' && error.constraint?.includes('admin_email')) {
            throw new Error('Email already exists');
        }
        throw new Error(error.message || 'Failed to update admin');
    }
}

export async function softDeleteAdmin(adminId: number) {
    try {
        const result = await pool.query(
            `UPDATE admin SET delete_at = CURRENT_TIMESTAMP WHERE id = $1 AND delete_at IS NULL RETURNING id`,
            [adminId]
        );
        return result.rows[0];
    } catch (error: any) {
        throw new Error(error.message || 'Failed to delete admin');
    }
}

export async function hardDeleteAdmin(adminId: number) {
    let client: PoolClient | null = null;
    try {
        client = await pool.connect();
        await client.query('BEGIN');
        await client.query(
            `DELETE FROM authen WHERE id = $1`,
            [adminId]
        );
        const result = await client.query(
            `DELETE FROM admin WHERE id = $1 RETURNING id`,
            [adminId]
        );
        await client.query('COMMIT');
        return result.rows[0];
    } catch (error: any) {
        if (client) {
            await client.query('ROLLBACK');
        }
        throw new Error(error.message || 'Failed to delete admin');
    } finally {
        client?.release();
    }
}