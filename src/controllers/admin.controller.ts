import { createAdmin, loginAdmin, getAllAdmin, getAdminById, updateAdmin, softDeleteAdmin, hardDeleteAdmin } from '../services/admin.service';
import { Request, Response } from 'express';

export async function handleCreateAdmin(req: Request, res: Response) {
  const { username, password, firstname, lastname, email, role } = req.body;
  if (!username || !password || !firstname || !lastname || !email) {
    return res.status(400).json({ error: 'Username, password, firstname, lastname and email are required' });
  }
  try {
    const result = await createAdmin({ username, password, firstname, lastname, email, role });
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function handleLoginAdmin(req: Request, res: Response) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  try {
    const result = await loginAdmin(username, password);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
}

export async function handleGetAllAdmin(req: Request, res: Response) {
  try {
    const result = await getAllAdmin();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function handleGetAdminById(req: Request, res: Response) {
  const adminId = parseInt(req.params.id, 10);
  if (isNaN(adminId)) {
    return res.status(400).json({ error: 'Invalid admin ID' });
  }
  try {
    const result = await getAdminById(adminId);
    if (!result) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function handleUpdateAdmin(req: Request, res: Response) {
  const adminId = parseInt(req.params.id, 10);
  if (isNaN(adminId)) {
    return res.status(400).json({ error: 'Invalid admin ID' });
  }

  const { firstname, lastname, role, email } = req.body;
  if (
    firstname === undefined &&
    lastname === undefined &&
    role === undefined &&
    email === undefined
  ) {
    return res.status(400).json({ error: 'At least one field is required: firstname, lastname, role, email' });
  }

  try {
    const result = await updateAdmin(adminId, { firstname, lastname, role, email });
    if (!result) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function handleSoftDeleteAdmin(req: Request, res: Response) {
  const adminId = parseInt(req.params.id, 10);
  if (isNaN(adminId)) {
    return res.status(400).json({ error: 'Invalid admin ID' });
  }
  try {
    const result = await softDeleteAdmin(adminId);
    if (!result) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    res.json({ message: 'Admin soft deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function handleHardDeleteAdmin(req: Request, res: Response) {
  const adminId = parseInt(req.params.id, 10);
  if (isNaN(adminId)) {
    return res.status(400).json({ error: 'Invalid admin ID' });
  }
  try {
    const result = await hardDeleteAdmin(adminId);
    if (!result) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    res.json({ message: 'Admin hard deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}