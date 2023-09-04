import { request, response } from "express";
import mongoose from "mongoose";
import { MongoClient } from "mongodb";
import nodemailer from "nodemailer";

import { Sequelize, QueryTypes } from "sequelize";
import fs from "fs";
import path from "path";

import xlsx from "xlsx";
import { exec } from "child_process";
import {
  connectTomysql_service,
  deleteFromMysql,
  restoreToMySql,
  add_mysql,
  delete_mysql,
  update_mysql,
} from "../service/mysql_service.js";
import {
  connectToMongo_service,
  deleteFromMongo,
  restoreToMongo,
  delete_mongo,
  update_mongo,
  add_mongo,
} from "../service/mongo_service.js";
import {
  Login_service,
  CreateAcount_service,
} from "../service/login_service.js";
import {
  connectToPostgre_service,
  deleteFromPostgre,
  restoreToPostgre,
  add_postgre,
  delete_postgre,
  update_postgres,
} from "../service/postgre_service.js";
import {
  searchExcelFiles_service,
  deleteFromExcel,
  restoreToExcel,
  delete_excel,
  update_excel,
  add_excel,
} from "../service/excel_service.js";
import {
  connectTosqlServer_service,
  deleteFromSqlServer,
  restoreToSqlServer,
  add_sqlServer,
  delete_sqlServer,
  update_sqlServer,
} from "../service/sqlserver_service.js";
import {
  connectToOracle_service,
  deleteFromOracle,
} from "../service/oracle_service.js";
import {
  sendlastOperations_service,
  sendHistory_service,
  deleteHistory_service,
} from "../service/history_service.js";
import { queryMaker_service } from "../service/queryMaker_service.js";
import { cardesInfo, groupBySchema } from "../service/other_services.js";
import {getUsers} from "../service/other_services.js"


/******************************************isactivated***************************** */
export const isactivated = async (req,res)=>{
  let users =[]
  users = await getUsers(); if(users==undefined){
    users=[]
  }
  try{
    let user = req.body
      let activated = false;
      for(let i of users){
        if(i.user.email==user.email){
          activated = i.activated
        }
      }
      return res.json({activated})
  }catch(err){
    console.log(err)
  }
}
/***********************************activerAccount************************************* */


export const activerAccount = async(req,res)=>{
  let users =[]
  users = await getUsers(); if(users==undefined){
    users=[]
  }
  try{
    console.log("wait to activateyour account")
       let user = req.body

      for(let i of users){
        if(i.user.email==user.reponse.email){
           i.activated=true
        }
      }
      if(users!=[]){
        await fs.writeFileSync("../users.json", JSON.stringify(users), (err) => {
          if (err) throw err;
        });
      }
     
      return res.json({success:true})
    }catch(err){
      console.log(err)
      return res.json({success:false})
  
    }
}
/***************************************suppressionRestant*************************** */

export const suppressionRestant = async(req,res)=>{
  let users =[]
  users = await getUsers(); if(users==undefined){
    users=[]
  }
  try{
      let user = req.body
      let suppression = 0;
      for(let i of users){
        if(i.user.email==user.email){
          suppression = i.maxSuppresion.suppression
        }
      }
      return res.json({suppression})
  }catch(err){
    console.log(err)
  }
}
/*****************************************renialiser****************************** */
export const renialiser = async(req,res)=>{
  try{
    let users =[]
    users = await getUsers(); if(users==undefined){
    users=[]
  }
    let user = req.body.reponse
    console.log(user)

    for(let i of users){
      if(i.user.email==user.email){
        i.maxSuppresion.suppression=0
      }
    }
    if(users!=[]){
      await fs.writeFileSync("../users.json", JSON.stringify(users), (err) => {
        if (err) throw err;
      });
    }
    return res.json({success:true})
  }catch(err){
    console.log(err)
    return res.json({success:false})

  }
}
/*****************************Login-CreateAccount************************************ */
export async function Login(req, res) {
  
  await Login_service(req, res);
}
export async function CreateAcount(req, res) {
  await CreateAcount_service(req, res);
}

/**************************sendLastOperations-sendHistory****************************** */
export const sendlastOperations = async (req, res) => {
  await sendlastOperations_service(req, res);
};
export const sendHistory = async (req, res) => {
  await sendHistory_service(req, res);
};
export const deleteHistory = async (req, res) => {
  try {
    let result = await deleteHistory_service(req.body);
    return res.status(200).json({ ok: result });
  } catch (err) {
    return res.status(500).json(err);
  }
};
/****************************************infoCard*************************************** */
export const sendCardsInfo = async (req, res) => {
  let email = req.query.email;
  const result = await cardesInfo(email);
  return res.status(200).json(result);
};
/************************************Connecting******************************************** */
export const connectingDBs = async (req, res) => {
  try {
    let result = {};
    const databases = JSON.parse(decodeURIComponent(req.query.databases));
    const recherche = req.query.recherche;
    const querys = await queryMaker_service(recherche);
    for (let database of databases) {
      if (database.databaseType == "mysql") {
        console.log(database);
        result.mysql = await connectTomysql_service(querys.mysql, database);
      } else if (database.databaseType == "mongo") {
        result.mongo = await connectToMongo_service(querys.mongo, database);
      } else if (database.databaseType == "postgres") {
        result.postgre = await connectToPostgre_service(
          querys.postgres,
          database
        );
      } else if (database.databaseType == "excel") {
        await searchExcelFiles_service(querys.excel, database).then((res) => {
          console.log("data from excel => ",JSON.stringify(res))
          result.excel = res;
        });
      } else if (database.databaseType == "sqlserver") {
        result.sqlserver = await connectTosqlServer_service(
          querys.sqlserver,
          database
        );
      } else if (database.databaseType == "oracle") {
        result.oracle = await connectToOracle_service(querys.oracle, database);
      }
    }
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).send(error.message);
    console.log(error);
  }
};
/***************************************Deleting****************************************** */
export const deletingFromDbs = async (req, res) => {
  try {
    let users =[]
    users = await getUsers(); if(users==undefined){
    users=[]
  }
    const recherche = req.query.recherche;
    const databases = JSON.parse(decodeURIComponent(req.query.databases));
    const user = req.query.user;
    let deleted = 0;
    const querys = await queryMaker_service(recherche);
    let result = {};
    let flag=false
    users.forEach((item) => {
      if (item.user.email === user.email) {
        if(item.maxSuppresion.max==item.maxSuppresion.suppression){
          flag=true
        }
      }
    });
    if(flag){
      return res.status(200).json({compte:"expired",message:"Vous avez atteint le nombre maximum de suppression !!!"})
    }
    for (const database of databases) {
      let deleteMethod;
      switch (database.databaseType) {
        case "postgres":
          deleteMethod = deleteFromPostgre;
          break;
        case "mysql":
          deleteMethod = deleteFromMysql;
          break;
        case "mongo":
          deleteMethod = deleteFromMongo;
          break;
        case "excel":
          deleteMethod = deleteFromExcel;
          break;
        case "sqlserver":
          deleteMethod = deleteFromSqlServer;
          break;
        case "oracle":
          deleteMethod = deleteFromOracle;
          break;
        default:
          continue;
      }

      if (deleteMethod) {
        try {
          const deleteResult = await deleteMethod(
            querys[database.databaseType],
            database,
            user
          );
          result[database.databaseType] = deleteResult;
          if (deleteResult != undefined) {
            for (let elm of deleteResult) {
              if (elm.affectedRow > 0) {
                deleted += elm.affectedRow;
              }
            }
          } else {
            deleted = 0;
          }
        } catch (err) {
          console.error(`Error in deleteFrom${database.databaseType}:`, err);
        }
      }
    }
    result.deleted = deleted;
    // Save history
    const now = new Date();
    const currentTime = now.toISOString(); // Format the current time as ISO string

    const conditions = Object.values(recherche)
      .filter((value) => value !== "")
      .join(" - ");

    users.forEach((item) => {
      if (item.user.email === user.email) {
        item.maxSuppresion.suppression+=1;
      }
    });

   
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
};
/****************************************Restore*************************************** */
export const restoreToDbs = async (req, res) => {
  try {
    let users =[]
    users = await getUsers(); if(users==undefined){
    users=[]
  }
    let data = req.body.data;
    let user = req.body.user;
    let result = {
      postgre: [],
      mysql: [],
      mongo: [],
      excel: [],
      sqlserver: [],
      oracle: [],
    };
    for (const row of data) {
      let restoreMethode;
      switch (row.databaseType) {
        case "postgre":
          restoreMethode = restoreToPostgre;
          break;
        case "mysql":
          restoreMethode = restoreToMySql;
          break;
        case "mongo":
          restoreMethode = restoreToMongo;
          break;
        case "excel":
          restoreMethode = restoreToExcel;
          break;
        case "sqlserver":
          restoreMethode = restoreToSqlServer;
          break;
        case "oracle":
          restoreMethode = restoreToOracle;
          break;
        default:
          continue;
      }
      if (restoreMethode) {
        try {
          const RestoreResult = await restoreMethode(row, user);
          result[row.databaseType].push(RestoreResult.message);
          console.log("--------------------------------------------->",result)
        } catch (err) {
          console.log(`Error in RestoreTo${database.databaseType}:`, err);
        }
      }
    }
    // await fs.writeFileSync("../users.json", JSON.stringify(users), (err) => {
    //   if (err) throw err;
    // });
    for (let key of Object.keys(result)) {
      if (result[key].length == 0) {
        delete result[key];
      }
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
  }
};

/****************************************Add Database************************************/

export const addDatabaseStep1 = async (req, res) => {

  try {
    let users =[]
    users = await getUsers(); if(users==undefined){
    users=[]
  }
    const databasePara = req.body.database;
    const user = req.body.user;
    let files = [];
    let error = false;
    if (databasePara.databaseType == "mongo") {
      await mongoose
        .connect(`${databasePara.connectionString}/`, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          autoCreate: false,
        })
        .then(() => {
          console.log("MONGO connected successfully");
        })
        .catch((err) => {
          error = true;
          console.log("Unable to connect to the Server:" + err);
        });

      if (error) {
        return res.status(200).json({
          error: error,
          files: files.length,
          docs: { filesPath: files, filesName: "mongo database" },
        });
      }

      const adminDb = mongoose.connection.db.admin();
      const dbList = await adminDb.listDatabases();
      for (let i = 0; i < dbList.databases.length; i++) {
        if (
          dbList.databases[i].name != "admin" &&
          dbList.databases[i].name != "config" &&
          dbList.databases[i].name != "local"
        ) {
          files.push(dbList.databases[i].name);
        }
      }
      let existFiles = [];
      for (let u of users) {
        u.databases.map((elm) => {
          if (u.user.email == user.email) {
            if (elm.databasePara.databaseType == databasePara.databaseType) {
              existFiles.push(elm.databaseName);
            }
          }
        });
      }
      console.log(existFiles);
      files = files.filter((element) => !existFiles.includes(element));

      return res.status(200).json({
        error: error,
        files: files.length,
        docs: { filesPath: files, filesName: "mongo database" },
      });
    } else if (databasePara.databaseType == "excel") {
      let files = [];
      let error = false;
      await new Promise((resolve, reject) => {
        exec(
          `dir /s /b "${databasePara.directory}" | findstr /i "\\.xlsx$"`,
          (error, stdout, stderr) => {
            if (error) {
              reject(error);
              return;
            }
            resolve(
              stdout
                .split("\n")
                .filter((file) => file.trim() !== "")
                .map((file) => file.replace(/\r/g, "")) // Remove \r characters
            );
          }
        );
      })
        .then((res) => {
          files = res;
        })
        .catch((err) => {
          error = true;
          console.error(err);
        });
      if (error == true) {
        return res
          .status(200)
          .json({ error: error, files: files.length, docs: [] });
      }
      if (files.length == 0) {
        return res
          .status(200)
          .json({ error: error, files: files.length, docs: [] });
      }
      let existFiles = [];
      for (let u of users) {
        u.databases.map((elm) => {
          if (u.user.email == user.email) {
            if (elm.databasePara.databaseType == databasePara.databaseType) {
              elm.tables.map((e) => {
                existFiles.push(e);
              });
            }
          }
        });
      }
      files = files.filter((element) => !existFiles.includes(element));
      let filesName = [];
      files.map((elm) => {
        filesName.push(path.basename(elm));
      });
      //sort table from a to z
      filesName = filesName.sort(function (a, b) {
        return a.localeCompare(b);
      });
      return res.status(200).json({
        auth: true,
        error: error,
        files: files.length,
        docs: { filesPath: files, filesName: filesName },
      });
    } else if (databasePara.databaseType == "mysql") {
      const sequelize = new Sequelize(
        `mysql://${databasePara.username}:${databasePara.password}@${databasePara.host}:${databasePara.port}/`
      );

      await sequelize
        .authenticate()
        .then(() => {
          console.log("MYSQL connected successfully.");
        })
        .catch((err) => {
          error = true;
          console.log("Unable to connect to the Server:" + err);
        });
      if (error) {
        return res.status(200).json({
          error: error,
          files: files.length,
          docs: { filesPath: files, filesName: "mysql database" },
        });
      }
      const databases_name = await sequelize.query("SHOW DATABASES;");
      files = databases_name[0]
        .map((result) => result.Database)
        .filter(
          (database) =>
            ![
              "information_schema",
              "performance_schema",
              "mysql",
              "phpmyadmin",
              "sys",
            ].includes(database)
        );

      let existFiles = [];
      for (let u of users) {
        u.databases.map((elm) => {
          if (u.user.email == user.email) {
            if (elm.databasePara.databaseType == databasePara.databaseType) {
              existFiles.push(elm.databaseName);
            }
          }
        });
      }
      files = files.filter((element) => !existFiles.includes(element));
      return res.status(200).json({
        error: error,
        files: files.length,
        docs: { filesPath: files, filesName: "mysql database" },
      });
    } else if (databasePara.databaseType == "postgres") {
      const sequelize = new Sequelize(
        "postgres",
        `${databasePara.username}`,
        `${databasePara.password}`,
        {
          host: `${databasePara.host}`, //localhost
          port: `${databasePara.port}`, //5432
          dialect: "postgres",
        }
      );
      await sequelize
        .authenticate()
        .then(() => {
          console.log("POSTGRES connected successfully.");
        })
        .catch((err) => {
          error = true;
          console.log(err);
        });
      if (error) {
        return res.status(200).json({
          error: error,
          files: files.length,
          docs: { filesPath: files, filesName: "postgres database" },
        });
      }

      await sequelize
        .query("SELECT datname FROM pg_database WHERE datistemplate = false;", {
          type: Sequelize.QueryTypes.SELECT,
        })
        .then(async (allDatabases) => {
          for (let i = 0; i < allDatabases.length; i++) {
            if (allDatabases[i].datname != "postgres") {
              files.push(allDatabases[i].datname);
            }
          }
        });
      console.log("------", files);
      let existFiles = [];
      for (let u of users) {
        u.databases.map((elm) => {
          if (u.user.email == user.email) {
            if (elm.databasePara.databaseType == databasePara.databaseType) {
              existFiles.push(elm.databaseName);
            }
          }
        });
      }
      files = files.filter((element) => !existFiles.includes(element));
      return res.status(200).json({
        error: error,
        files: files.length,
        docs: { filesPath: files, filesName: "postgre database" },
      });
    } else if (databasePara.databaseType == "sqlserver") {
      const sequelize = new Sequelize(
        "",
        `${databasePara.username}`,
        `${databasePara.password}`,
        {
          dialect: "mssql",
          host: `${databasePara.host}`, //localhost
          port: `${databasePara.port}`, //1433
          dialectOptions: {
            options: {
              encrypt: true, // For Azure SQL Managed instances
              trustServerCertificate: true, // For Azure SQL Managed instances
            },
          },
        }
      );

      let databases = [];

      await sequelize
        .authenticate()
        .then(() => {
          console.log("SQL Server connected successfully.");
        })
        .catch((err) => {
          error = true;
          console.log("Unable to connect to the Server:" + err);
        });
      if (error) {
        return res.status(200).json({
          error: error,
          files: files.length,
          docs: { filesPath: files, filesName: "sqlServer database" },
        });
      }
      await sequelize
        .query("SELECT name FROM sys.databases", {
          type: QueryTypes.SELECT,
        })
        .then((dbs) => {
          for (let database of dbs) {
            files.push(database.name);
          }
        })
        .catch((error) => {
          console.error("Error getting databases", error);
        });

      sequelize.close();
      //[ 'master', 'tempdb', 'model', 'msdb', 'newDB' ]
      files = files.filter((name) => {
        return !["master", "tempdb", "model", "msdb"].includes(name);
      });
      console.log(files);
      let existFiles = [];
      for (let u of users) {
        u.databases.map((elm) => {
          if (u.user.email == user.email) {
            if (elm.databasePara.databaseType == databasePara.databaseType) {
              existFiles.push(elm.databaseName);
            }
          }
        });
      }
      files = files.filter((element) => !existFiles.includes(element));
      return res.status(200).json({
        error: error,
        files: files.length,
        docs: { filesPath: files, filesName: "sqlServer database" },
      });
    }
  } catch (err) {
    console.log(err);
  }
};

export const addDatabase_submit = async (req, res) => {
  try {
    let users =[]
    users = await getUsers(); if(users==undefined){
    users=[]
  }
    let databasePara = req.body.databasePara;
    let selectedDatabase = req.body.selectedDatabase;
    let informations = req.body.informations;
    let user = req.body.user;
    let error = false;
    if (databasePara.databaseType == "mongo") {
      let tables = [];
      const connectionToDB = await mongoose.createConnection(
        `${databasePara.connectionString}/${selectedDatabase[0]}`
      );
      connectionToDB.on("error", (error) => {
        error = true;
        console.error("Connection error:", error);
      });

      connectionToDB.on("connected", () => {
        console.log("Connected to the database");
      });

      connectionToDB.on("disconnected", () => {
        console.log("Disconnected from the database");
      });
      if (error) {
        return res.status(200).json({ error: error, tables: tables });
      }
      await new Promise((resolve) => connectionToDB.once("open", resolve));
      let connectionSting = `${databasePara.connectionString}`;
      let collections = [];
      if (
        connectionSting.includes("127.0.0.1") ||
        connectionSting.includes("localhost")
      ) {
        console.log("Server type: Local");
        collections = await connectionToDB.db.listCollections().toArray();
      } else {
        const url = `${databasePara.connectionString}`;

        // Créer une instance du client MongoDB
        const client = new MongoClient(url, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });

        // Se connecter au serveur MongoDB
        client
          .connect()
          .then(() => {
            // Récupérer une référence à la base de données
            const db = client.db(selectedDatabase[0]);

            // Obtenir le curseur ListCollectionsCursor
            const collectionsCursor = db.listCollections();
            console.log("----------", collectionsCursor);
            // Extraire les collections existantes
            const collections = [];
            collectionsCursor
              .forEach((collection) => {
                collections.push(collection);
              })
              .then(() => {
                // Afficher les collections existantes
                console.log("---------------------", collections);

                // Fermer la connexion au serveur MongoDB
                client.close();
              })
              .catch((err) => {
                console.error(
                  "Erreur lors de la récupération des collections:",
                  err
                );
                client.close();
              });
          })
          .catch((err) => {
            console.error(
              "Erreur lors de la connexion au serveur MongoDB:",
              err
            );
          });
      }
      //collections have other information i don't need it
      collections.map((elm) => {
        tables.push(elm.name);
      });
      for (let u of users) {
        if (u.user.email == user.email) {
          u.databases.push({
            databasePara: databasePara,
            databaseName: selectedDatabase[0],
            tables: tables,
            informations: informations,
            id: generateUniqueId(u.databases),
            color: "rgba(255, 196, 196, 0.534)",
          });
        }
      }
      if(users!=[]){
        await fs.writeFileSync("../users.json", JSON.stringify(users), (err) => {
          if (err) throw err;
        });
      }
      return res.status(200).json({ error: error, tables: tables });
    } else if (databasePara.databaseType == "excel") {
      for (let u of users) {
        if (u.user.email == user.email) {
          u.databases.push({
            databasePara: databasePara,
            databaseName: databasePara.direction,
            tables: selectedDatabase,
            informations: informations,
            id: generateUniqueId(u.databases),
            color: "rgba(43, 255, 0, 0.534)",
          });
        }
      }
      if(users!=[]){
        await fs.writeFileSync("../users.json", JSON.stringify(users), (err) => {
          if (err) throw err;
        });
      }
      return res.status(200).json({ error: error, tables: selectedDatabase });
    } else if (databasePara.databaseType == "postgres") {
      const db = new Sequelize(
        `${selectedDatabase[0]}`,
        `${databasePara.username}`,
        `${databasePara.password}`,
        {
          host: `${databasePara.host}`, //localhost
          port: `${databasePara.port}`, //5432
          dialect: "postgres",
        }
      );
      //get all table of database
      let resultofTables = [];
      resultofTables = await db.query(
        "SELECT table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE' AND table_schema='public';",
        { type: Sequelize.QueryTypes.SELECT }
      );
      let tables = [];
      resultofTables.map((table) => {
        tables.push(table[0]);
      });
      for (let u of users) {
        if (u.user.email == user.email) {
          u.databases.push({
            databasePara: databasePara,
            databaseName: selectedDatabase[0],
            tables: tables,
            informations: informations,
            id: generateUniqueId(u.databases),
            color: "rgba(0, 140, 255, 0.534)",
          });
        }
      }
      if(users!=[]){
        await fs.writeFileSync("../users.json", JSON.stringify(users), (err) => {
          if (err) throw err;
        });
      }
      return res.status(200).json({ error: error, tables: tables });
    } else if (databasePara.databaseType == "sqlserver") {
      const db = new Sequelize(
        `${selectedDatabase[0]}`,
        `${databasePara.username}`,
        `${databasePara.password}`,
        {
          dialect: "mssql",
          host: `${databasePara.host}`, //localhost
          port: `${databasePara.port}`, //1433
          dialectOptions: {
            options: {
              encrypt: true, // For Azure SQL Managed instances
              trustServerCertificate: true, // For Azure SQL Managed instances
            },
          },
        }
      );
      //  tables = await db.query('SELECT table_name FROM all_tables', { type: Sequelize.QueryTypes.SELECT });
      const tablesFounded = await db.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_CATALOG='${selectedDatabase[0]}'`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      //[ { TABLE_NAME: 'users' }, { TABLE_NAME: 'goodPeople' } ]
      let tables = [];
      tablesFounded.map((table) => {
        tables.push(table.TABLE_NAME);
      });
      console.log(tables);
      for (let u of users) {
        if (u.user.email == user.email) {
          u.databases.push({
            databasePara: databasePara,
            databaseName: selectedDatabase[0],
            tables: tables,
            informations: informations,
            id: generateUniqueId(u.databases),
            color: "rgba(255, 0, 157, 0.555)",
          });
        }
      }
      if(users!=[]){
        await fs.writeFileSync("../users.json", JSON.stringify(users), (err) => {
          if (err) throw err;
        });
      }
      return res.status(200).json({ error: error, tables: tables });
    } else if (databasePara.databaseType == "mysql") {
      const db = new Sequelize(
        `mysql://${databasePara.username}:${databasePara.password}@${databasePara.host}:${databasePara.port}/${selectedDatabase[0]}`,
        {
          dialect: "mysql",
          logging: false,
        }
      );
      const tbls = await db.showAllSchemas();
      const filteredTables = tbls.filter(
        (table) =>
          !table[`Tables_in_${selectedDatabase[0]}`].endsWith("_seq") &&
          !(table[`Tables_in_${selectedDatabase[0]}`] == "hibernate_sequence")
      );
      let tables = filteredTables.map(
        (table) => table[`Tables_in_${selectedDatabase[0]}`]
      );
      console.log(tables);
      for (let u of users) {
        if (u.user.email == user.email) {
          u.databases.push({
            databasePara: databasePara,
            databaseName: selectedDatabase[0],
            tables: tables,
            informations: informations,
            id: generateUniqueId(u.databases),
            color: "rgba(255, 217, 0, 0.733)",
          });
        }
      }
      if(users!=[]){
        await fs.writeFileSync("../users.json", JSON.stringify(users), (err) => {
          if (err) throw err;
        });
      }
      return res.status(200).json({ error: error, tables: tables });
    }
  } catch (err) {
    console.log("addDatabase_submit", err);
  }
};
export const getDatabaseInfo = async (req, res) => {
  let users =[]
  users = await getUsers(); if(users==undefined){
    users=[]
  }
  try {
    let user = req.body;
    for (let u of users) {
      if (u.user.email == user.email) {
        return res.status(200).json({ databases: u.databases });
      }
    }
  } catch (err) {}
};
/******************************************************************************************* */
export const accesToDB = async (req, res) => {
  try {
    let users =[]
    users = await getUsers(); if(users==undefined){
    users=[]
  }
    let databasePara = req.body.database.databasePara;
    let table = req.body.table;
    let databaseName = req.body.database.databaseName;
    let error = false;
    let AllData = [];
    if (databasePara.databaseType == "mysql") {
      console.log(databaseName);
      const db = new Sequelize(
        `mysql://${databasePara.username}:${databasePara.password}@${databasePara.host}/${databaseName}`,
        {
          dialect: "mysql",
          logging: false,
        }
      );
      db.authenticate()
        .then(() => {
          console.log("Connection has been established successfully.");
        })
        .catch((error) => {
          error = true;
          console.error("Unable to connect to the database:", error);
        });
      if (error) {
        return res.status(200).json({ error: error, data: AllData });
      }
      let query = `SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = '${databaseName}'
          AND TABLE_NAME = '${table}'
          AND CONSTRAINT_NAME = 'PRIMARY'`;

      let primaryKey_result = await db.query(query);
      try {
        //get primary key
        let q = `SELECT * FROM ${table} ;`;
        let result = await db.query(q);
        AllData = result[0];
        const queryToGetSchema = `DESCRIBE ${table}`;
        const resultOfSchema = await db.query(queryToGetSchema);
        let schema = [];
        resultOfSchema[0].map((s) => {
          schema.push(s.Field);
        });
        console.log("schema -----------> ", schema);
        return res
          .status(200)
          .json({
            error: error,
            data: AllData,
            primaryKey: primaryKey_result[0][0].COLUMN_NAME,
            schema,
          });
      } catch (err) {
        console.log(err);
      }
    } else if (databasePara.databaseType == "mongo") {
      (async () => {
        try {
          const connectionToDB = await mongoose.createConnection(
            `${databasePara.connectionString}/${databaseName}`
          );
          
          connectionToDB.on("error", (err) => {
            console.error("Error connecting to MongoDB database:", err);
          });

          connectionToDB.on("connected", async () => {
            console.log("Connected to MongoDB database");
            try {
              const newCollection = connectionToDB.collection(table);
              let indexes = [];
              indexes = await newCollection.getIndexes();
              console.log("---------------------------->",indexes)
              const uniqueIndexes = Object.keys(indexes);
              removeUnderscoreSuffix(uniqueIndexes)
              let allData = [];
              allData = await newCollection.find({}).toArray();
              const formattedData = groupBySchema(allData);
              return res
                .status(200)
                .json({ error: false, data: formattedData ,primaryKeys:removeUnderscoreSuffix(uniqueIndexes)});
            } catch (err) {
                "Error fetching data from MongoDB collection:",
              console.error(
                err
              );
              return res
                .status(500)
                .json({ error: true, message: "Internal server error" });
            }
          });
        } catch (err) {
          console.error("Error connecting to MongoDB database:", err);
        }
      })();
    } else if (databasePara.databaseType == "postgres") {
      const db = new Sequelize(
        `${databaseName}`,
        `${databasePara.username}`,
        `${databasePara.password}`,
        {
          host: `${databasePara.host}`,
          port: `${databasePara.port}`,
          dialect: "postgres",
          logging: false,
        }
      );
      let query = `SELECT * FROM ${table} ; `;
      AllData = await db.query({
        query: query,
        type: Sequelize.QueryTypes.SELECT,
      });

      const queryToGetSchema = `
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = '${table}'
  ORDER BY column_name ASC;`; //DESC
      const resultOfSchema = await db.query({
        query: queryToGetSchema,
        type: Sequelize.QueryTypes.SELECT,
      });
      let schema = [];
      resultOfSchema[0].map((s) => {
        schema.push(s.column_name);
      });
      console.log("=============gggg==============>", resultOfSchema);

      let queryToGetPrimaryKey = `SELECT a.attname AS column_name
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        WHERE c.conrelid = '${table}'::regclass
          AND c.contype = 'p';`;
      const resultOfPrimaryKey = await db.query({
        query: queryToGetPrimaryKey,
        type: Sequelize.QueryTypes.SELECT,
      });
      return res
        .status(200)
        .json({
          error: error,
          data: AllData[0],
          schema,
          primaryKey: resultOfPrimaryKey[0][0].column_name,
        });
    } else if (databasePara.databaseType == "sqlserver") {
      const db = new Sequelize(
        `${databaseName}`,
        `${databasePara.username}`,
        `${databasePara.password}`,
        {
          dialect: "mssql",
          host: `${databasePara.host}`, //localhost
          port: `${databasePara.port}`, //1433
          dialectOptions: {
            options: {
              encrypt: true, // For Azure SQL Managed instances
              trustServerCertificate: true, // For Azure SQL Managed instances
            },
          },
        }
      );
      let query = `select * from ${table} ;`;
      AllData = await db.query({
        query: query,
        type: Sequelize.QueryTypes.SELECT,
      });
      const queryToGetSchema = `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = '${table}';`;
      const resultOfSchema = await db.query(queryToGetSchema, {
        type: Sequelize.QueryTypes.SELECT,
      });
      let schema = [];
      resultOfSchema.map((s) => {
        schema.push(s.COLUMN_NAME);
      });

      let queryToGetPrimaryKey = `SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE OBJECTPROPERTY(OBJECT_ID(CONSTRAINT_SCHEMA + '.' + CONSTRAINT_NAME), 'IsPrimaryKey') = 1
          AND TABLE_NAME = '${table}';
        `;
      const resultOfPrimaryKey = await db.query(queryToGetPrimaryKey, {
        type: Sequelize.QueryTypes.SELECT,
      });
      return res
        .status(200)
        .json({
          error: error,
          data: AllData[0],
          schema,
          primaryKey: resultOfPrimaryKey[0].COLUMN_NAME,
        });
    } else if (databasePara.databaseType == "excel") {
      const workbook = xlsx.readFile(table);
      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const sheetData = xlsx.utils.sheet_to_json(sheet);
        if(sheetData[0]!=null &&sheetData[0]!=undefined ){
          AllData.push({
            sheetName,
            data: sheetData,
            schema: Object.keys(sheetData[0]),
          });
        }
      });
      return res.status(200).json({ error: error, data: AllData });
    }
  } catch (err) {
    console.log(err);
  }
};
function removeUnderscoreSuffix(indexNames) {
  const modifiedIndexNames = indexNames.map((indexName) => {
    const lastIndexUnderscore = indexName.lastIndexOf('_');
    if (lastIndexUnderscore !== -1) {
      return indexName.slice(0, lastIndexUnderscore);
    }
    return indexName;
  });

  return modifiedIndexNames;
}
export async function deleteDatabaseService(req, res) {
  try {
    let users =[]
    users = await getUsers(); if(users==undefined){
    users=[]
  }
    let database = req.body.database;
    let user = req.body.user;
    console.log(database, user);
    let oldLenght;
    let newLenght;
    for (let u of users) {
      if (u.user.email == user.email) {
        oldLenght = u.databases.length;
        u.databases = deleteObjectById(u.databases, database.id);
        newLenght = u.databases.length;
      }
    }
    if(users!=[]){
      await fs.writeFileSync("../users.json", JSON.stringify(users), (err) => {
        if (err) throw err;
      });
    }
    return res.status(200).json({ deleted: oldLenght - newLenght });
  } catch (err) {
    console.log(err);
  }
};

/*****************************************OTHER SERVICES***************************************** */

const deleteObjectById = (arr, id) => {
  // Use the filter() method to create a new array excluding the object with the matching ID
  const filteredArray = arr.filter((obj) => obj.id !== id);

  return filteredArray;
};

function generateUniqueId(array) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const length = 8;
  let id = "";

  do {
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      id += characters.charAt(randomIndex);
    }
  } while (array.some((item) => item.id === id));

  return id;
}

export const addToDB = async (req, res) => {
  try {
    let users =[]
    users = await getUsers(); if(users==undefined){
    users=[]
  }
    const elm = req.body.elm;
    const parametres = req.body.parametres;
    const table = req.body.table;
    const mySheetName = req.body.sheetName;
    if (parametres.databasePara.databaseType == "mysql") {
      const result = await add_mysql(elm, parametres, table);
      if (result == -1) {
        return res.status(200).json({ error: true });
      } else if (result > 0) {
        return res.status(200).json({ error: false, added: result });
      }
    } else if (parametres.databasePara.databaseType == "mongo") {
      const result = await add_mongo(elm, parametres, table);
      if (result == -1) {
        return res.status(200).json({ error: true });
      } else if (result.id != "") {
        return res.status(200).json({ error: false, added: result ,primaryKeys:result.primarykeys});
      }
    } else if (parametres.databasePara.databaseType == "postgres") {
      const result = await add_postgre(elm, parametres, table);
      if (result == -1) {
        return res.status(200).json({ error: true });
      } else if (result > 0) {
        return res.status(200).json({ error: false, added: result });
      }
    } else if (parametres.databasePara.databaseType == "sqlserver") {
      const result = await add_sqlServer(elm, parametres, table);
      if (result == -1) {
        return res.status(200).json({ error: true });
      } else if (result > 0) {
        return res.status(200).json({ error: false, added: result });
      }
    } else if (parametres.databasePara.databaseType == "excel") {
      const result = await add_excel(elm, table, mySheetName);
      if (result == -1) {
        return res.status(200).json({ error: true });
      } else if(result == -2){
        return res.status(200).json({ error: true, added: result ,message:"Le nom de la feuille n'existe pas, vous pouvez l'ajouter en cochant la case correspondante. " });
      }else if(result == -3){
        return res.status(200).json({ error: true, added: result ,message:"le nom de la feuille déja existe ! ,utiliser le button 'add' pour garder la structure de fichier  " });

      }
      
      else if (result > 0) {
        return res.status(200).json({ error: false, added: result });
      }
    }
  } catch (err) {
    console.log(err);
  }
};

export const deleteFromDb = async (req, res) => {
 
  //delete
  try {
    let users =[]
    users = await getUsers(); if(users==undefined){
    users=[]
  }
    const elm = req.body.elm;
    const parametres = req.body.parametres;
    const table = req.body.table;
    const user = req.body.user;
    const mySheetName = req.body.sheetName;
    let flag=false
    users.forEach((item) => {
      if (item.user.email === user.email) {
        if(item.maxSuppresion.max==item.maxSuppresion.suppression){
          flag=true
        }
      }
    });
    if(flag){
      return res.status(200).json({ok:false,message:"vous aver deppasér le maximum de suppression"})
    }
    if (parametres.databasePara.databaseType == "mysql") {
      const result = await delete_mysql(elm, parametres, table, user);
      if (result == -1) {
        return res.status(200).json({ ok: false });
      } else {
        // users.forEach((item) => {
        //   if (item.user.email === user.email) {
        //     item.maxSuppresion.suppression+=1;
        //   }
        // });
      //   if(users!=[]){
      //   await fs.writeFileSync("../users.json", JSON.stringify(users), (err) => {
      //     if (err) throw err;
      //   });
      // }
        return res.status(200).json({ ok: true, deleted: result });
      }
    } else if (parametres.databasePara.databaseType == "postgres") {
      const result = await delete_postgre(elm, parametres, table, user);
      if (result == -1) {
        return res.status(200).json({ ok: false });
      } else {
        // users.forEach((item) => {
        //   if (item.user.email === user.email) {
        //     item.maxSuppresion.suppression+=1;
        //   }
        // });
      //   if(users!=[]){
      //   await fs.writeFileSync("../users.json", JSON.stringify(users), (err) => {
      //     if (err) throw err;
      //   });
      // }
        return res.status(200).json({ ok: true, deleted: result });
      }
    } else if (parametres.databasePara.databaseType == "sqlserver") {
      const result = await delete_sqlServer(elm, parametres, table, user);
      if (result == -1) {
        return res.status(200).json({ ok: false });
      } else {
      //   users.forEach((item) => {
      //     if (item.user.email === user.email) {
      //       item.maxSuppresion.suppression+=1;
      //     }
      //   });
      //   if(users!=[]){
      //   await fs.writeFileSync("../users.json", JSON.stringify(users), (err) => {
      //     if (err) throw err;
      //   });
      // }
        return res.status(200).json({ ok: true, deleted: result });
      }
    } else if (parametres.databasePara.databaseType == "mongo") {
      const result = await delete_mongo(elm, parametres, table, user);
      if (result == -1) {
        return res.status(200).json({ ok: false });
      } else {
      //   users.forEach((item) => {
      //     if (item.user.email === user.email) {
      //       item.maxSuppresion.suppression+=1;
      //     }
      //   });
      //   if(users!=[]){
      //   await fs.writeFileSync("../users.json", JSON.stringify(users), (err) => {
      //     if (err) throw err;
      //   });
      // }
        return res.status(200).json({ ok: true, deleted: result });
      }
    } else if (parametres.databasePara.databaseType == "excel") {
      const result = await delete_excel(
        elm,
        parametres,
        table,
        user,
        mySheetName
      );
      if (result == -1) {
        return res.status(200).json({ ok: false });
      } else {
      //   users.forEach((item) => {
      //     if (item.user.email === user.email) {
      //       item.maxSuppresion.suppression+=1;
      //     }

      //   });
      //   if(users!=[]){
      //   await fs.writeFileSync("../users.json", JSON.stringify(users), (err) => {
      //     if (err) throw err;
      //   });
      // }
        return res.status(200).json({ ok: true, deleted: result });
      }
    }
    
  } catch (err) {
    console.log(err);
  }
};

export const updateDb = async (req, res) => {
  try {
    let users =[]
    users = await getUsers(); if(users==undefined){
    users=[]
  }
    const data = req.body.data;
    const parametres = req.body.paramtres;
    const table = req.body.table;
    const primaryKey = req.body.primaryKey;
    const mySheetName = req.body.sheetName;
    const original = req.body.original;
    if (parametres.databasePara.databaseType == "mysql") {
      const result = await update_mysql(data, parametres, table, primaryKey);
      if (result > 0) {
        return res.status(200).json({ ok: true, updated: result });
      } else {
        return res.status(200).json({ ok: false });
      }
    } else if (parametres.databasePara.databaseType == "postgres") {
      const result = await update_postgres(data, parametres, table, primaryKey);
      if (result > 0) {
        return res.status(200).json({ ok: true, updated: result });
      } else {
        return res.status(200).json({ ok: false });
      }
    } else if (parametres.databasePara.databaseType == "sqlserver") {
      const result = await update_sqlServer(
        data,
        parametres,
        table,
        primaryKey
      );
      if (result > 0) {
        return res.status(200).json({ ok: true, updated: result });
      } else {
        return res.status(200).json({ ok: false });
      }
    } else if (parametres.databasePara.databaseType == "mongo") {
      const result = await update_mongo(data, parametres, table, primaryKey);
      if (result > 0) {
        return res.status(200).json({ ok: true, updated: result });
      } else {
        return res.status(200).json({ ok: false });
      }
    } else if (parametres.databasePara.databaseType == "excel") {
      const result = await update_excel(
        data,
        parametres,
        table,
        mySheetName,
        original
      );
      if (result > 0) {
        return res.status(200).json({ ok: true, updated: result });
      } else {
        return res.status(200).json({ ok: false });
      }
    }
  } catch (err) {
    console.log(err);
  }
};



/******************************************************* */

export const sendEmail = (req, res)=>{
  console.log("hiiiiiiii")
  var data = req.body;
  console.log(data);
  mailsender(data.email, data.emailSubject, data.message);
  res.send("got the data");
}

var transport = nodemailer.createTransport({
  host:'smtp.gmail.com',
  port: 465,
  secure: true,
  requireTLS: true,
  auth:{
      user:"hossam.messiaze123@gmail.com",
      pass:"avgedcborpfaadtw"
  },
  tls : { rejectUnauthorized: false }
});



const mailsender =(email, subject, message)=>{
  var mailOption = {
      from: 'hossam.messiaze123@gmail.com',
      to: email,
      subject: subject,
      html: emailContent
  }
  transport.sendMail(mailOption, function(error, info){
      if(error)
      {
          console.warn(error);
      }
      else{
          console.warn("email has been sent : ", info )
      }
  
  })
}
