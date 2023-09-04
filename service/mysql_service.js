import { request, response } from "express";
import mongoose from "mongoose";
import { Sequelize, QueryTypes } from "sequelize";
import fs from "fs";
import xlsx from "xlsx";
import { exec } from "child_process";
import oracledb from "oracledb";
import { deepEqual } from "./other_services.js";
import { generateWhereClause } from "./queryMaker_service.js";
import {getUsers} from "./other_services.js"


export const connectTomysql_service = async (data, server) => {
  let users =[]
  users = await getUsers(); if(users==undefined){
    users=[]
  }
  const sequelize = new Sequelize(
    `mysql://${server.username}:${server.password}@${server.host}:${server.port}/`
  ); //root/
  let databases = [];
  let final_results = [];
  let Autothification = false;
  try {
    await sequelize
      .authenticate()
      .then(() => {
        console.log("MYSQL connected successfully.");
      })
      .catch((err) => {
        Autothification = true;
        console.log("Unable to connect to the Server:" + err);
      });
    if (Autothification) {
      return -1;
    }
    // Get list of databases
    const databases_name = await sequelize.query("SHOW DATABASES;");
    databases = databases_name[0]
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
    let tableDontHaveMyColumn = 0;
    let maxTableInServer = 0;
    for (const database of databases) {
      const db = new Sequelize(
        `mysql://${server.username}:${server.password}@${server.host}:${server.port}/${database}`,
        {
          dialect: "mysql",
          logging: false,
        }
      );
      const tbls = await db.showAllSchemas();
      const filteredTables = tbls.filter(
        (table) =>
          !table[`Tables_in_${database}`].endsWith("_seq") &&
          !(table[`Tables_in_${database}`] == "hibernate_sequence")
      );
      let tables = filteredTables.map(
        (table) => table[`Tables_in_${database}`]
      );
      let values = [];
      let query = ``;
      maxTableInServer += tables.length;
      for (const table of tables) {
        query = `SELECT * FROM ${table} WHERE ` + data + ";";

        await db
          .query(query)
          .then((results) => {
            values.push({ tableName: table, docs: results[0] });
          })
          .catch((err) => {
            console.log("mysql query not correct -> ", err);
            tableDontHaveMyColumn += 1;
          });
      }
      final_results.push({
        database: database,
        values: values,
      });
      values = [];
    }
    console.log(
      "***********maxTableInServer<=tableDontHaveMyColumn*************",
      maxTableInServer,
      tableDontHaveMyColumn
    );
    if (maxTableInServer <= tableDontHaveMyColumn) {
      return -2;
    }
    return final_results;
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
};
export const deleteFromMysql = async (data, server, user) => {
  try {
    let users =[]
    users = await getUsers(); if(users==undefined){
    users=[]
  }
    const sequelize = new Sequelize(
      `mysql://${server.username}:${server.password}@${server.host}:${server.port}/`
    ); //root/

    let databases = [];
    let final_results = [];
    let RestoreData = [];

    await sequelize
      .authenticate()
      .then(() => {
        console.log("MYSQL connected successfully.");
      })
      .catch((err) => console.log(err));
    // Get list of databases
    const databases_name = await sequelize.query("SHOW DATABASES;");
    databases = databases_name[0]
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

    for (const database of databases) {
      const db = new Sequelize(
        `mysql://${server.username}:${server.password}@${server.host}:${server.port}/${database}`,
        {
          dialect: "mysql",
          logging: false,
        }
      );
      const tbls = await db.showAllSchemas();
      const filteredTables = tbls.filter(
        (table) =>
          !table[`Tables_in_${database}`].endsWith("_seq") &&
          !(table[`Tables_in_${database}`] == "hibernate_sequence")
      );

      let tables = filteredTables.map(
        (table) => table[`Tables_in_${database}`]
      );
      let values = [];
      let query = ``;

      for (const table of tables) {
        let q = `SELECT * FROM ${table} WHERE ` + data + ";";
        let restoredData;
        await db
          .query(q)
          .then((result) => {
            restoredData = result;
          })
          .catch((e) => {
            console.log(e);
          });

        query = `DELETE FROM ${table} WHERE ` + data + ";";

        await db
          .query(query)
          .then((results) => {
            final_results.push({
              affectedRow: results[0].affectedRows,
              table: table,
              database: database,
              type: "mysql",
            });
            if (results[0].affectedRows > 0) {
              restoredData[0].map((elm) => {
                let tableSchema = {};
                for (let key of Object.keys(elm)) {
                  tableSchema[key] = typeof elm[key];
                }
                RestoreData.push({
                  databaseType: "mysql",
                  databaseName: `${database}`,
                  tableName: `${table}`,
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
    }
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
    console.error("Unable to connect to the database:", error);
  }
};
export const restoreToMySql = async (data, user) => {
  try {
    let users =[]
    users = await getUsers(); if(users==undefined){
    users=[]
  }
    // {"databaseType":"mysql","databaseName":"database1","tableName":"employe","rowdeleted":{"email":"houssam"},"tableSchema":{"email":"string"},"databasePara":{"username":"root","password":"","port":"3306","host":"localhost"}}
    const db = new Sequelize(
      `mysql://${data.databasePara.username}:${data.databasePara.password}@${data.databasePara.host}:${data.databasePara.port}/${data.databaseName}`
    );
    await db
      .authenticate()
      .then(() => {
        console.log("connected to mysql", data.databaseName);
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
    console.log("----------------->",query)
    let results = await db.query(query);
    /*
    The first element, 0, typically represents the number of rows that were updated or modified by the query.
    The second element, 1, typically represents the number of rows that were inserted by the query.
    */

    if (results[1] >= 1) {
      //deleting from history
      for (let u of users) {
        if (user.email == u.user.email) {
          u.historique = u.historique.filter((el) => !deepEqual(el, data));
        }
      }
      // await fs.writeFileSync("../users.json", JSON.stringify(users), (err) => {
      //   if (err) throw err;
      // });
      if(users!=[]){
        await fs.writeFileSync("../users.json", JSON.stringify(users), (err) => {
          if (err) throw err;
        });
      }
      return { ok: "succes", message:"succés" };
    } else {
      return { ok: "failed", message :"failed" };
    }
  } catch (err) {
    return { ok: "failed", message :"duplicate value !!" };
  }
};

export const add_mysql = async (elm, paramatres, table) => {
  let users =[]
  users = await getUsers(); if(users==undefined){
    users=[]
  }
  const db = new Sequelize(
    `mysql://${paramatres.databasePara.username}:${paramatres.databasePara.password}@${paramatres.databasePara.host}:${paramatres.databasePara.port}/${paramatres.databaseName}`,
    {
      dialect: "mysql",
      logging: false,
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
    const result = await db.query(query);
    console.log("-------------------------", result[1]);
    return result[1];
  } catch (err) {
    console.log("----------err---------------");
    console.log(err);
    return -1;
  }
};

export const delete_mysql = async (elm, paramatres, table, user) => {
  let users =[]
  console.log("********************************************")
  users = await getUsers(); if(users==undefined){
    users=[]
  }
  const db = new Sequelize(
    `mysql://${paramatres.databasePara.username}:${paramatres.databasePara.password}@${paramatres.databasePara.host}:${paramatres.databasePara.port}/${paramatres.databaseName}`,
    {
      dialect: "mysql",
      logging: false,
    }
  );

  let query = `DELETE FROM ${table}  ${generateWhereClause(elm,"mysql","where")} ;`;
  try {
    const result = await db.query(query);
    console.log("-------------------------", result[0].affectedRows);
    if (result[0].affectedRows >= 1) {
      //saving historique
      let tableSchema = {};
      for (let key of Object.keys(elm)) {
        tableSchema[key] = typeof elm[key];
      }
      for (let i of users) {
        if (i.user.email == user.email) {
          i.historique.push({
            databaseType: "mysql",
            databaseName: `${paramatres.databaseName}`,
            tableName: `${table}`,
            rowdeleted: elm,
            tableSchema: tableSchema,
            databasePara: {
              username: paramatres.databasePara.username,
              password: paramatres.databasePara.password,
              port: paramatres.databasePara.port,
              host: paramatres.databasePara.host,
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
         fs.writeFile("../users.json", JSON.stringify(users), (err) => {
          if (err) throw err;
        });
      }
    }

    return result[0].affectedRows;
  } catch (err) {
    console.log("----------err---------------");
    console.log(err);
    return -1;
  }
};

export const update_mysql = async (data, parametres, table, primaryKey) => {
  try {
    let users =[]
    users = await getUsers(); if(users==undefined){
    users=[]
  }
    const db = new Sequelize(
      `mysql://${parametres.databasePara.username}:${parametres.databasePara.password}@${parametres.databasePara.host}:${parametres.databasePara.port}/${parametres.databaseName}`,
      {
        dialect: "mysql",
        logging: false,
      }
    );

    let whereClause = {};
    whereClause[primaryKey] = data[primaryKey];
    delete data[primaryKey];
    let query = `UPDATE ${table} SET ${generateWhereClause(data,"mysql","set")}  ${generateWhereClause(
      whereClause,"mysql","where"
    )}`;
    console.log("__________________", query);
    const [rowsUpdated] = await db.query(query);
    const affectedRows = rowsUpdated.affectedRows;
    console.log("updated Successfully: ", affectedRows);
    return affectedRows;
  } catch (err) {
    console.log(err);
    return -1;
  }
};

