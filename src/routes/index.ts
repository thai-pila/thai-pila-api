import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";

import { uploadMediaController } from "../controllers/upload.controller";

import {
    createCategoryController,
    findCategoryByIdController,
    findAllCategoriesController,
    findCategoryByTeacherUUIDController,
    updateCategoryByIdController,
    hardDeleteCategoryByIdController,
    softDeleteCategoryByIdController
} from "../controllers/category.controller";

import { 
    createGroupController, 
    findGroupByIdController, 
    findAllGroupsController, 
    findGroupByTeacherUUIDController,
    updateGroupByIdController,
    hardDeleteGroupByIdController,
    softDeleteGroupByIdController
} from "../controllers/group.controller";

import {
    createGameInfoController,
    findGameInfoByIdController,
    findGameInfoByUuidController,
    findAllGameInfoController,
    findAllCreateByByTeacherUuidController,
    findGamesBySequenceIdController,
    findAllQuestionCategoriesController,
    updateExerciseNameAndSuggestionController,
    updateOtherImageController,
    hardDeleteOtherImageController,
    softDeleteGameInfoController,
    generateUUIDForPilaController,
    getGameSwapOptionsController,
    cloneGameTemplateController,
    cloneGameTemplateWithGameTypeController,
    updateGameStatusController,
    hardDeleteGameInfoController,
    softDeleteBanGameInfoController,
    restoreBanGameInfoController,
    updateGameTypeByGameUuidController,
    updateThumbnailByGameUuidController,
    updateSubjectByGameUuidController,
    updateGroupIdByGameUuidController,
    countAllGamesExceptGameDefaultController,
    findAllGamesByPlayCountDescController,
    findAllGamesExceptGameDefaultByPlayCountDescController,
    getAllUserCreatedGameLogsController,
    getAllGameTypePopularCreateGameRankingController,
    getLiveDashboardGamesCapacityAverageController,
    getLiveDashboardCapacityByGameUuidController,
} from "../controllers/gameInfo.controller";

import {
    createSequenceController,
    findSequenceByIdController,
    findAllSequenceInfoController,
    addGamesToSequenceController,
    addGamesToSequenceByGameUuidController,
    findSequenceByGameIdController,
    findSequenceByUuidWithGamesController,
    hardDeleteGamesFromSequenceController,
    findSequenceByUuidWithGameDetailsController,
    softDeleteSequenceByIdController,
    updateExerciseNameController,
    updateSequenceStatusController,
    hardDeleteSequenceByIdController
} from "../controllers/sequenceInfo.controller";

import { 
    getLessonLibraryByUuidController, 
    getLessonLibraryController, 
    getLessonLibraryByTeacherUuidController, 
    getDefaultGameLibraryController,
    getLibraryExceptGameDefaultController
} from "../controllers/lessonLibrary.controller";

import {
    createQuestionMultipleController,
    findQuestionsByGameIdController,
    findAllQuestionsController,
    updateQuestionMultipleController,
    updateChoicesByQuestionController,
    createChoicesByQuestionController,
    softDeleteQuestionController,
    hardDeleteQuestionController,
    hardDeleteChoicesController,
    hardDeleteQuestionMediaFieldController,
    hardDeleteChoiceMediaFieldController
} from "../controllers/multipleChoice.controller";

import {
    createSituationQuestionMultipleController,
    findSituationQuestionsByGameIdController,
    findAllSituationQuestionsController,
    updateSituationQuestionMultipleController,
    updateSituationChoicesByQuestionController,
    createSituationChoicesByQuestionController,
    createSituationAssetsController,
    updateSituationAssetController,
    hardDeleteSituationAssetController,
    softDeleteSituationQuestionController,
    hardDeleteSituationQuestionController,
    hardDeleteSituationChoicesController,
    hardDeleteQuestionSituationMediaFieldController,
    hardDeleteChoiceSituationMediaFieldController
} from "../controllers/situation.controller";

import {
    createMatchingController,
    findMatchingsByGameIdController,
    findAllMatchingsController,
    updateMatchingController,
    softDeleteMatchingController,
    hardDeleteMatchingController,
    hardDeleteMatchingMediaFieldController
} from "../controllers/matching.controller";

import {
    createAnagramController,
    findAnagramsByGameIdController,
    findAllAnagramsController,
    updateAnagramController,
    softDeleteAnagramController,
    hardDeleteAnagramController,
    hardDeleteAnagramMediaFieldController,
} from "../controllers/anagram.controller";

import {
    createCompleteTheSentenceController,
    findCompleteTheSentencesByGameIdController,
    findAllCompleteTheSentencesController,
    updateCompleteTheSentenceController,
    softDeleteCompleteTheSentenceController,
    hardDeleteCompleteTheSentenceController,
    hardDeleteCompleteTheSentenceMediaFieldController
} from "../controllers/complete_the_sentence.controller";

import {
    createCorrectAnswerController,
    findCorrectAnswersByGameIdController,
    findAllCorrectAnswersController,
    updateCorrectAnswerController,
    softDeleteCorrectAnswerController,
    hardDeleteCorrectAnswerController,
    hardDeleteCorrectAnswerMediaFieldController
} from "../controllers/correct_answer.controller";

import { 
    handleCreateAdmin, 
    handleLoginAdmin,
    handleGetAllAdmin,
    handleGetAdminById,
    handleUpdateAdmin,
    handleSoftDeleteAdmin,
    handleHardDeleteAdmin
} from "../controllers/admin.controller";

import {
    createTeacherIfNotExistsController,
    checkTeacherFromJwtController,
    checkUserByJwtController,
    createUserByJwtController,
    countTeacherController,
    getAllTeacherNameCountCreateGameRankingController
} from "../controllers/teacher.controller";

import {
    createNoteController,
    findAllNotesController,
    findNoteByIdController,
    findNotesByUuidController,
    findNotesByTeacherUuidController,
    updateNoteController,
    softDeleteNoteController,
    hardDeleteNoteController,
} from "../controllers/note.controller";

import {
    createPopularGameController,
    getTopPopularGamesController,
} from "../controllers/popular_game.controller";

import { 
    liveDashboardController,
    getAllLiveDashboardsController,
    getLiveDashboardByIdController,
    getLiveDashboardsByTeacherUuidController,
    getLiveDashboardsByStudentUuidController,
    getLiveDashboardStudentsByGameOrSequenceController,
 } from "../controllers/live_dashboard.controller";

 import { 
    createRecommendGameByGameIdController,
    deleteRecommendGameByGameIdController,
     findAllRecommendGamesController,
     updateRecommendGameNoByGameIdController
 } from "../controllers/recommend_game.controller";

const router = express.Router();

// const uploadDir = path.resolve(__dirname, "../../../../img");
// console.log("UPLOAD DIR =", uploadDir);

// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

const uploadDir = path.resolve(__dirname, "../../upload");
console.log("UPLOAD DIR =", uploadDir);

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    },
});
const upload = multer({ storage: storage });

// Admin routes
router.post("/admin/create", handleCreateAdmin);
router.post("/admin/login", handleLoginAdmin);
router.get("/admin", handleGetAllAdmin);
router.get("/admin/:id", handleGetAdminById);
router.patch("/admin/:id", handleUpdateAdmin);
router.patch("/admin/:id/soft-delete", handleSoftDeleteAdmin);
router.delete("/admin/:id", handleHardDeleteAdmin);

// Media upload route
router.post("/upload-media", upload.single("file"), uploadMediaController);

// Category API route
router.post("/category", createCategoryController);
router.get("/category/:id", findCategoryByIdController);
router.get("/category", findAllCategoriesController);
router.get("/category/teacher/:teacher_uuid", findCategoryByTeacherUUIDController);
router.put("/category/:id", updateCategoryByIdController);
router.delete("/category/:id", hardDeleteCategoryByIdController);
router.patch("/category/:id/soft-delete", softDeleteCategoryByIdController);

// Group API route
router.post("/group", createGroupController);
router.get("/group/:id", findGroupByIdController);
router.get("/group", findAllGroupsController);
router.get("/group/teacher/:teacher_uuid", findGroupByTeacherUUIDController);
router.put("/group/:id", updateGroupByIdController);
router.delete("/group/:id", hardDeleteGroupByIdController);
router.patch("/group/:id/soft-delete", softDeleteGroupByIdController);

// Game info API route
router.post("/game", upload.single('thumbnail'), createGameInfoController);
router.post("/game/clone-template", cloneGameTemplateController);
router.post("/game/clone-template-with-game-type", cloneGameTemplateWithGameTypeController);
router.get("/game/popular-create-game-ranking", getAllGameTypePopularCreateGameRankingController);
router.get("/game/uuid/:uuid", findGameInfoByUuidController);
router.get("/game/questionCategory", findAllQuestionCategoriesController);
router.get("/game/create-by/teacher/:teacher_uuid", findAllCreateByByTeacherUuidController);
router.get("/game/swap-options", getGameSwapOptionsController);
router.get("/game/count-game-except-game-default", countAllGamesExceptGameDefaultController);
router.get("/game/play-count-ranking", findAllGamesByPlayCountDescController);
router.get("/game/play-count-ranking-except-game-default", findAllGamesExceptGameDefaultByPlayCountDescController);
router.get("/game/live-dashboard/capacity-average", getLiveDashboardGamesCapacityAverageController);
router.get("/game/live-dashboard/capacity/:uuid", getLiveDashboardCapacityByGameUuidController);
router.get("/game/user-created-logs", getAllUserCreatedGameLogsController);
router.patch("/game/update-game-type", updateGameTypeByGameUuidController);
router.patch("/game/update-thumbnail", upload.single('thumbnail'), updateThumbnailByGameUuidController);
router.patch("/game/update-subject", updateSubjectByGameUuidController);
router.patch("/game/update-group", updateGroupIdByGameUuidController);
router.patch("/game/:id/status", updateGameStatusController);
router.get("/game/:id", findGameInfoByIdController);
router.get("/game", findAllGameInfoController);
router.get("/game/sequence/:sequenceId", findGamesBySequenceIdController);
router.patch("/game/:id/soft-delete", softDeleteGameInfoController);
router.patch("/game/:id/exerciseNameAndSuggestion", updateExerciseNameAndSuggestionController);
router.patch("/game/:id/other-image", upload.single('other_image'), updateOtherImageController);
router.delete("/game/:id/other-image", hardDeleteOtherImageController);
router.post("/game/uuid-for-pila", generateUUIDForPilaController);
router.delete("/game/:id", hardDeleteGameInfoController);
router.patch("/game/:id/soft-delete-ban", softDeleteBanGameInfoController);
router.patch("/game/:id/restore-ban", restoreBanGameInfoController);

// Sequence info API route
router.post("/sequence", upload.single('thumbnail'), createSequenceController);
router.get("/sequence/uuid/:uuid/game-details", findSequenceByUuidWithGameDetailsController);
router.get("/sequence/uuid/:uuid", findSequenceByUuidWithGamesController);
router.get("/sequence/:id", findSequenceByIdController);
router.get("/sequence", findAllSequenceInfoController);
router.post("/sequence/addGames", addGamesToSequenceController);
router.post("/sequence/addGamesByUuid", addGamesToSequenceByGameUuidController);
router.delete("/sequence/:sequenceId/games", hardDeleteGamesFromSequenceController);
router.get("/sequence/game/:gameId", findSequenceByGameIdController);
router.patch("/sequence/:id/soft-delete", softDeleteSequenceByIdController);
router.patch("/sequence/:id/exerciseName", updateExerciseNameController);
router.patch("/sequence/:id/status", updateSequenceStatusController);
router.delete("/sequence/:id", hardDeleteSequenceByIdController);

// Lesson library API route
router.get("/lesson-library", getLessonLibraryController);
router.get("/lesson-library/uuid/:uuid", getLessonLibraryByUuidController);
router.get("/lesson-library/teacher/:teacher_uuid", getLessonLibraryByTeacherUuidController);
router.get("/lesson-library/default-games", getDefaultGameLibraryController);
router.get("/lesson-library/except-default-games", getLibraryExceptGameDefaultController);

// Multiple choice question API route
router.post("/game/:gameId/questions", createQuestionMultipleController);
router.put("/questions/:questionId", updateQuestionMultipleController);
router.put("/questions/:questionId/choices", updateChoicesByQuestionController);
router.get("/game/:gameId/questions", findQuestionsByGameIdController);
router.get("/questions", findAllQuestionsController);
router.post("/questions/:questionId/choices", createChoicesByQuestionController);
router.delete("/questions/:questionId", hardDeleteQuestionController);
router.patch("/questions/:questionId/soft-delete", softDeleteQuestionController);
router.patch("/questions/:questionId/hard-delete-field", hardDeleteQuestionMediaFieldController);
router.post("/questions/:questionId/choices/delete", hardDeleteChoicesController);
router.patch("/choices/:choiceId/hard-delete-field", hardDeleteChoiceMediaFieldController);

// Situation question API route
router.post("/game/:gameId/situationQuestions", createSituationQuestionMultipleController);
router.get("/game/:gameId/situationQuestions", findSituationQuestionsByGameIdController);
router.get("/situationQuestions", findAllSituationQuestionsController);
router.put("/situationQuestions/:questionId", updateSituationQuestionMultipleController);
router.post("/situationQuestions/:questionId/choices", createSituationChoicesByQuestionController);
router.put("/situationQuestions/:questionId/choices", updateSituationChoicesByQuestionController);
router.delete("/situationQuestions/:questionId", hardDeleteSituationQuestionController);
router.post("/situationQuestions/:questionId/choices/delete", hardDeleteSituationChoicesController);
router.patch("/situationQuestions/:questionId/soft-delete", softDeleteSituationQuestionController);
router.patch("/situationQuestions/:questionId/hard-delete-field", hardDeleteQuestionSituationMediaFieldController);
router.patch("/situationChoices/:choiceId/hard-delete-field", hardDeleteChoiceSituationMediaFieldController);

// Situation assets API route
router.post("/game/:gameId/situation-assets", createSituationAssetsController);
router.patch("/situation-assets/:assetId", updateSituationAssetController);
router.delete("/situation-assets/:assetId", hardDeleteSituationAssetController);

// Matching question API route
router.post("/game/:gameId/matchings", createMatchingController);
router.get("/game/:gameId/matchings", findMatchingsByGameIdController);
router.get("/matchings", findAllMatchingsController);
router.put("/matchings/:matchingId", updateMatchingController);
router.patch("/matchings/:matchingId/soft-delete", softDeleteMatchingController);
router.patch("/matchings/:matchingId/hard-delete-field", hardDeleteMatchingMediaFieldController);
router.delete("/matchings/:matchingId", hardDeleteMatchingController);

// Anagram question API route
router.post("/game/:gameId/anagrams", createAnagramController);
router.get("/game/:gameId/anagrams", findAnagramsByGameIdController);
router.get("/anagrams", findAllAnagramsController);
router.put("/anagrams/:anagramId", updateAnagramController);
router.patch("/anagrams/:anagramId/soft-delete", softDeleteAnagramController);
router.patch("/anagrams/:anagramId/hard-delete-field", hardDeleteAnagramMediaFieldController);
router.delete("/anagrams/:anagramId", hardDeleteAnagramController);

// Complete the sentence question API route
router.post("/game/:gameId/complete-the-sentences", createCompleteTheSentenceController);
router.get("/game/:gameId/complete-the-sentences", findCompleteTheSentencesByGameIdController);
router.get("/complete-the-sentences", findAllCompleteTheSentencesController);
router.put("/complete-the-sentences/:completeTheSentenceId", updateCompleteTheSentenceController);
router.patch("/complete-the-sentences/:completeTheSentenceId/soft-delete", softDeleteCompleteTheSentenceController);
router.patch("/complete-the-sentences/:completeTheSentenceId/hard-delete-field", hardDeleteCompleteTheSentenceMediaFieldController);
router.delete("/complete-the-sentences/:completeTheSentenceId", hardDeleteCompleteTheSentenceController);

// Correct answer API route
router.post("/game/:gameId/correct-answers", createCorrectAnswerController);
router.get("/game/:gameId/correct-answers", findCorrectAnswersByGameIdController);
router.get("/correct-answers", findAllCorrectAnswersController);
router.put("/correct-answers/:correctAnswerId", updateCorrectAnswerController);
router.patch("/correct-answers/:correctAnswerId/soft-delete", softDeleteCorrectAnswerController);
router.patch("/correct-answers/:correctAnswerId/hard-delete-field", hardDeleteCorrectAnswerMediaFieldController);
router.delete("/correct-answers/:correctAnswerId", hardDeleteCorrectAnswerController);

// Teacher API route
router.post("/teacher", createTeacherIfNotExistsController);
router.get("/teacher/check-user", checkUserByJwtController);
router.post("/teacher/create-user", createUserByJwtController);
router.get("/teacher/check-user-all-process", checkTeacherFromJwtController);
router.get("/teacher/count", countTeacherController);
router.get("/teacher/ranking/create-game", getAllTeacherNameCountCreateGameRankingController);

// Note API route
router.post('/note', createNoteController);
router.put('/note/:id', updateNoteController);
router.get('/note/uuid/:uuid', findNotesByUuidController);
router.get('/note/:id', findNoteByIdController);
router.get('/note', findAllNotesController);
router.get('/note/teacher/:teacher_uuid', findNotesByTeacherUuidController);
router.patch('/note/:id/soft-delete', softDeleteNoteController);
router.delete('/note/:id', hardDeleteNoteController);

// Popular game API route
router.post('/popular-game', createPopularGameController);
router.get('/popular-game/top', getTopPopularGamesController);

// Live dashboard API route
router.post('/live-dashboard', liveDashboardController);
router.get('/live-dashboard', getAllLiveDashboardsController);
router.get('/live-dashboard/students', getLiveDashboardStudentsByGameOrSequenceController);
router.get('/live-dashboard/:id', getLiveDashboardByIdController);
router.get('/live-dashboard/teacher/:teacher_uuid', getLiveDashboardsByTeacherUuidController);
router.get('/live-dashboard/student/:student_uuid', getLiveDashboardsByStudentUuidController);

// Recommend game API route
router.post('/recommend-game', createRecommendGameByGameIdController);
router.get('/recommend-game', findAllRecommendGamesController);
router.patch('/recommend-game/no', updateRecommendGameNoByGameIdController);
router.delete('/recommend-game/game/:gameId', deleteRecommendGameByGameIdController);

router.get("/", (req, res) => {
    res.json({
        status: "ok",
        message: "eef webgame API",
    });
});

export default router;
