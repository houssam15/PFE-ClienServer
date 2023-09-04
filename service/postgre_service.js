import { request, response } from "express";
import mongoose from "mongoose";
import { Sequelize, QueryTypes, where } from "sequelize";
import fs from "fs";
import xlsx from "xlsx";
import { exec } from "child_process";
import oracledb from "oracledb";
import { deepEqual } from "./other_services.js";
import { generateWhereClause } from "./queryMaker_service.js";
import {getUsers} from "./other_services.js"


export const connectToPostgre_service = async (data, server) => {
  try {
    let users =[]
  users = await getUsers(); if(users==undefined){
    users=[]
  }
    // username : postgres  and password : 0000
    const sequelize = new Sequelize(
      "postgres",
      `${server.username}`,
      `${server.password}`,
      {
        host: `${server.host}`,
        port: `${server.port}`,
        dialect: "postgres",
      }
    );
    let databases = [];
    let final_results = [];
    let Autothification = false;

    await sequelize
      .authenticate()
      .then(() => {
        console.log("POSTGRES connected successfully.");
      })
      .catch((err) => {
        Autothification = true;
        console.log("Unable to connect to the Server:" + err);
      });
    if (Autothification) {
      return -1;
    }
    // Get list of databases
    sequelize
      .query("SELECT datname FROM pg_database WHERE datistemplate = false;", {
        type: Sequelize.QueryTypes.SELECT,
      })
      .then(async (allDatabases) => {
        for (let i = 0; i < allDatabases.length; i++) {
          if (allDatabases[i].datname != "postgres") {
            databases.push(allDatabases[i].datname);
          }
        }
        sequelize.close();
        let tableDontHaveMyColumn = 0;
        let maxTableInServer = 0;
        for (let database of databases) {
          const db = new Sequelize(
            `${database}`,
            `${server.username}`,
            `${server.password}`,
            {
              host: `${server.host}`,
              port: `${server.port}`,
              dialect: "postgres",
              logging: false,
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
          let values = [];
          let query = ``;
          maxTableInServer += tables.length;
          for (let table of tables) {
            query = `SELECT * FROM ${table} WHERE ` + data + ";";
            console.log("-------------query----------------", query);
            const results = await db

              .query({
                query: query,
                type: Sequelize.QueryTypes.SELECT,
              })
              .then((results) => {
                values.push({ tableName: table, docs: results[0] });
              })
              .catch((err) => {
                console.log("postgres query not correct -> ", err);
                tableDontHaveMyColumn += 1;
              });
          }

          final_results.push({
            database: database,
            values: values,
          });
          values = [];
          db.close();
        }
        console.log(
          "********maxTableInServer<=tableDontHaveMyColumn*********",
          maxTableInServer <= tableDontHaveMyColumn
        );
        if (maxTableInServer <= tableDontHaveMyColumn) {
          return -2;
        }
      })
      .catch((error) => {
        console.error(error);
        sequelize.close();
      });

    await new Promise((resolve) => setTimeout(resolve, 2000)); // wait for 2 second

    return final_results;
  } catch (error) {
    console.error(error);
  }
};

export const deleteFromPostgre = async (data, server, user) => {
  try {
    let users =[]
  users = await getUsers(); if(users==undefined){
    users=[]
  }
    // username : postgres  and password : 0000  port : 5432
    const sequelize = new Sequelize(
      "postgres",
      `${server.username}`,
      `${server.password}`,
      {
        host: `${server.host}`, //localhost
        port: `${server.port}`, //5432
        dialect: "postgres",
      }
    );
    let databases = [];
    let final_results = [];
    let RestoreData = [];
    await sequelize
      .authenticate()
      .then(() => {
        console.log("POSTGRES connected successfully.");
      })
      .catch((err) => {
        console.log(err);
      });
    // Get list of databases

    sequelize
      .query("SELECT datname FROM pg_database WHERE datistemplate = false;", {
        type: Sequelize.QueryTypes.SELECT,
      })
      .then(async (allDatabases) => {
        for (let i = 0; i < allDatabases.length; i++) {
          if (allDatabases[i].datname != "postgres") {
            databases.push(allDatabases[i].datname);
          }
        }
        sequelize.close();
        for (let database of databases) {
          const db = new Sequelize(
            `${database}`,
            `${server.username}`,
            `${server.password}`,
            {
              host: `${server.host}`, //localhost
              port: `${server.port}`, //5432
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
          let values = [];
          let query = ``;
          for (let table of tables) {
            query = `DELETE FROM ${table} WHERE ` + data + ";";
            let queryH = `SELECT *  FROM ${table} WHERE ` + data + ";";
            const dataH = await db
              .query({
                query: queryH,
                type: Sequelize.QueryTypes.SELECT,
              })
              .catch((err) => console.log(err));
            await db
              .query({
                query: query,
                type: Sequelize.QueryTypes.DELETE,
              })
              .then((results) => {
                final_results.push({
                  affectedRow: results[1].rowCount,
                  table: table,
                  database: database,
                  type: "postgre",
                });
                if (results[1].rowCount > 0) {
                  dataH[0].map((elm) => {
                    let tableSchema = {};
                    for (let key of Object.keys(elm)) {
                      tableSchema[key] = typeof elm[key];
                    }
                    RestoreData.push({
                      databaseType: "postgre",
                      databaseName: database,
                      tableName: table,
                      rowdeleted: elm,
                      tableSchema: tableSchema,
                      databasePara: {
                        username: server.username,
                        password: server.password,
                        port: server.port,
                        host: server.host,
                      },
                    });
                  });
                }
              })
              .catch((err) => {
                console.log(err);
              });
          }

          db.close();
        }
      })
      .catch((error) => {
        console.error(error);
        sequelize.close();
      });
    await new Promise((resolve) => setTimeout(resolve, 2000)); // wait for 1 second
    for (let i of users) {
      if (i.user.email == user.email) {
        RestoreData.map((elm) => {
          i.historique.push(elm);
        });
      }
    }
    if(users!=[]){
      users.forEach((item) => {
        if (item.user.email === user.email) {
          item.maxSuppresion.suppression+=RestoreData.length;
        }
      });
      await fs.writeFileSync("../users.json", JSON.stringify(users), (err) => {
        if (err) throw err;
      });
    }
    return final_results;
  } catch (error) {
    console.error("error :", error);
  }
};

export const restoreToPostgre = async (data, user) => {
  try {
    let users =[]
  users = await getUsers(); if(users==undefined){
    users=[]
  }
    const db = new Sequelize(
      `${data.databaseName}`,
      `${data.databasePara.username}`,
      `${data.databasePara.password}`,
      {
        host: `${data.databasePara.host}`, //localhost
        port: `${data.databasePara.port}`, //5432
        dialect: "postgres",
      }
    );
    await db
      .authenticate()
      .then(() => {
        console.log("connected to postgres", data.databaseName);
      })
      .catch((err) => {
        console.log(err);
      });
    let tbl = "";
    let vls = "";
    for (let i of Object.keys(data.rowdeleted)) {
      if (tbl == "") {
        tbl += `${i}`;
      } else {
        tbl += `,${i}`;
      }
      if (vls == "") {
        vls += `'${data.rowdeleted[i]}'`;
      } else {
        vls += `,'${data.rowdeleted[i]}'`;
      }
    }
    let query = `INSERT INTO ${data.tableName}(${tbl}) VALUES(${vls}) ;`;

    let results = await db.query(query);

    if (results[1] >= 1) {
      //deleting from history
      for (let u of users) {
        if (user.email == u.user.email) {
          u.historique = u.historique.filter((el) => !deepEqual(el, data));
        }
      }
      if(users!=[]){
        await fs.writeFileSync("../users.json", JSON.stringify(users), (err) => {
          if (err) throw err;
        });
      }
      return { ok: "succes", message:"succés" };
    } else {
      return { ok: "failed", message:"failed" };
    }
    db.close();
  } catch (err) {
    console.error(err);
    return { ok: "failed", message :"duplicate values" };
  }
};

export const add_postgre = async (elm, parametres, table) => {
  try {
    let users =[]
  users = await getUsers(); if(users==undefined){
    users=[]
  }
    console.log("-----------------",elm, parametres, table)
    const db = new Sequelize(
      `${parametres.databaseName}`,
      `${parametres.databasePara.username}`,
      `${parametres.databasePara.password}`,
      {
        host: `${parametres.databasePara.host}`, //localhost
        port: `${parametres.databasePara.port}`, //5432
        dialect: "postgres",
      }
    );
    let tbl = "";
    let vls = "";
    for (let i of Object.keys(elm)) {
      if (tbl == "") {
        tbl += `${i}`;
      } else {
        tbl += `,${i}`;
      }
      if (vls == "") {
        vls += `'${elm[i]}'`;
      } else {
        vls += `,'${elm[i]}'`;
      }
    }

    let query = `INSERT INTO ${table}(${tbl}) VALUES(${vls}) ;`;
    try {
      const result = await db.query({
        query: query,
        type: Sequelize.QueryTypes.SELECT,
      });
      console.log("------------------> ", result);
      return result[1]
    } catch (e) {
      console.log("error in query : ", e);
      return -1;
    }
  } catch (err) {
    console.log(err);
  }
};


export const delete_postgre = async (elm, parametres, table,user) =>{
  try{
    let users =[]
  users = await getUsers(); if(users==undefined){
    users=[]
  }
    const db = new Sequelize(
      `${parametres.databaseName}`,
      `${parametres.databasePara.username}`,
      `${parametres.databasePara.password}`,
      {
        host: `${parametres.databasePara.host}`, //localhost
        port: `${parametres.databasePara.port}`, //5432
        dialect: "postgres",
      }
    );
    let whereClause = generateWhereClause(elm,"postgres","where")

    let query = `DELETE FROM ${table}  ${whereClause} ;`;
    
    try {
      const result = await db.query({
        query: query,
        type: Sequelize.QueryTypes.DELETE,
      });
      console.log("------------------> ", result[1].rowCount);
      if (result[1].rowCount >= 1) {
        //saving historique
        let tableSchema = {};
        for (let key of Object.keys(elm)) {
          tableSchema[key] = typeof elm[key];
        }
        for (let i of users) {
          if (i.user.email == user.email) {
            i.historique.push({
              databaseType: "postgre",
              databaseName: `${parametres.databaseName}`,
              tableName: `${table}`,
              rowdeleted: elm,
              tableSchema: tableSchema,
              databasePara: {
                username: parametres.databasePara.username,
                password: parametres.databasePara.password,
                port: parametres.databasePara.port,
                host: parametres.databasePara.host,
              },
            });
           
          }
        }
        if(users!=[]){
          users.forEach((item) => {
            if (item.user.email === user.email) {
              item.maxSuppresion.suppression+=1;
            }
          });
          await fs.writeFile("../users.json", JSON.stringify(users), (err) => {
            if (err) throw err;
          });
        }
      }
      return result[1].rowCount
    } catch (e) {
      console.log("error in query : ", e);
      return -1;
    }
  }catch(err){
    console.log(err)
  }
}


export const update_postgres  = async (data,parametres,table,primaryKey) => {
  try{
    let users =[]
  users = await getUsers(); if(users==undefined){
    users=[]
  }
    const db = new Sequelize(
      `${parametres.databaseName}`,
      `${parametres.databasePara.username}`,
      `${parametres.databasePara.password}`,
      {
        host: `${parametres.databasePara.host}`, //localhost
        port: `${parametres.databasePara.port}`, //5432
        dialect: "postgres",
      }
    );
    let whereClause = {};
    whereClause[primaryKey] = data[primaryKey];
    delete data[primaryKey];
    let query = `UPDATE ${table} SET ${generateWhereClause(data,"postgres","set")}  ${generateWhereClause(
      whereClause,"postgres",'where'
    )}`;
    console.log("__________________", query);
    const result = await db.query(query);
    console.log("updated Successfully: ", result[1].rowCount);
    return result[1].rowCount;
  }catch(err){
    console.log(err)
    return -1;
  }
}