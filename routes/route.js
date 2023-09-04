import express from "express";
const router = express.Router();
import {
  connectingDBs,
  deletingFromDbs,
  sendlastOperations,
  Login,
  CreateAcount,
  sendHistory,
  sendCardsInfo,
  restoreToDbs,
  deleteHistory,
  addDatabaseStep1,
  addDatabase_submit,
  getDatabaseInfo,
  deleteDatabaseService,
  accesToDB,
  addToDB,
  deleteFromDb,
  updateDb,
  sendEmail,
  renialiser,
  suppressionRestant,
  activerAccount,
  isactivated
} from "../controller/controlller.js";

router.get("/Connecting", connectingDBs);
router.get("/lastOperations", sendlastOperations);
router.get("/history", sendHistory);
router.delete("/Deleting", deletingFromDbs);
router.post("/Login", Login);
router.post("/CreateAccount", CreateAcount);
router.get("/cardInfo", sendCardsInfo);
router.post("/restore", restoreToDbs);
router.post("/deleteFromHistory", deleteHistory);
router.post("/addDatabase_Step1", addDatabaseStep1);
router.post("/addDatabase_submit", addDatabase_submit);
router.post("/getDatabaseInfo", getDatabaseInfo);
router.post("/deleteDatabaseService", deleteDatabaseService);
router.post("/accesToDB", accesToDB);
router.post("/addToDB",addToDB)
router.post("/deleteFromDb",deleteFromDb)
router.post("/updateDb",updateDb)
router.post("/sendEmail",sendEmail)
router.post("/renialiser",renialiser)
router.post('/activer',activerAccount)
router.post("/suppressionRestant",suppressionRestant)
router.post("/isactivated",isactivated)
export default router;
