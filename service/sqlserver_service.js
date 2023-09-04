import { request, response } from "express";
import mongoose from "mongoose";
import { Sequelize, QueryTypes } from "sequelize";
import fs from "fs";
import xlsx from "xlsx";
import { exec } from "child_process";
import oracledb from "oracledb";
import {deepEqual} from "./other_services.js"
import {generateWhereClause} from "./queryMaker_service.js"
import {getUsers} from "./other_services.js"


export async function connectTosqlServer_service( data, server) {
    try {
      let users =[]
  users = await getUsers(); if(users==undefined){
    users=[]
  }
      const sequelize = new Sequelize(
        "",
        `${server.username}`,
        `${server.password}`,
        {
          dialect: "mssql",
          host: `${server.host}`,//localhost
          port: `${server.port}`,//1433
          dialectOptions: {
            options: {
              encrypt: true, // For Azure SQL Managed instances
              trustServerCertificate: true, // For Azure SQL Managed instances
            },
          },
        }
      );
  
      let databases = [];
      let final_results = [];
      let Autothification = false;
      let checked = false;
      await sequelize
        .authenticate()
        .then(() => {
          console.log("SQL Server connected successfully.");
        })
        .catch((err) => {
          Autothification = true;
          console.log("Unable to connect to the Server:" + err);
        });
      if (Autothification) {
        return -1;
      }
  
      await sequelize
        .query("SELECT name FROM sys.databases", {
          type: QueryTypes.SELECT,
        })
        .then((dbs) => {
          for (let database of dbs) {
            databases.push(database.name);
          }
        })
        .catch((error) => {
          console.error("Error getting databases", error);
        });
  
      sequelize.close();
      //[ 'master', 'tempdb', 'model', 'msdb', 'newDB' ]
      databases = databases.filter((name) => {
        return !["master", "tempdb", "model", "msdb"].includes(name);
      });
      let tableDontHaveMyColumn=0
      let maxTableInServer=0
      for (let database of databases) {
        const db = new Sequelize(
          `${database}`,
          `${server.username}`,
          `${server.password}`,
          {
            dialect: "mssql",
            host: `${server.host}`,//localhost
            port: `${server.port}`,//1433
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
          `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_CATALOG='${database}'`,
          { type: Sequelize.QueryTypes.SELECT }
        );
        //[ { TABLE_NAME: 'users' }, { TABLE_NAME: 'goodPeople' } ]
        let tables = [];
        tablesFounded.map((table) => {
          tables.push(table.TABLE_NAME);
        });
        //[ 'users', 'goodPeople' ]
        let query = ``;
        let values = [];
        maxTableInServer+=tables.length;
        for (let table of tables) {
          query = `select * from ${table} where ` + data + ";";
          const results = await db
            .query({
              query: query,
              type: Sequelize.QueryTypes.SELECT,
            })
            .then((results) => {
              //newDB goodPeople [ [ { cin: 'cin1', email: 'houssam@gmail.com' } ], 1 ]
              values.push({ tableName: table, docs: results[0] });
            })
            .catch((err) => {
              tableDontHaveMyColumn+=1;
              console.log(err);
            });
        }
        final_results.push({
          database: database,
          values: values,
        });
        values = [];
        db.close();
      }
      if (maxTableInServer<=tableDontHaveMyColumn) {
        return -2;
      }
      
      return final_results;
    } catch (error) {
      console.log("Error while connecting to sql server", error);
    }
  }


  export  async function deleteFromSqlServer( data, server, user) {
    try {
      let users =[]
  users = await getUsers(); if(users==undefined){
    users=[]
  }
      const sequelize = new Sequelize(
        "",
        `${server.username}`,
        `${server.password}`,
        {
          dialect: "mssql",
          host: `${server.host}`,
          port: `${server.port}`,
          dialectOptions: {
            options: {
              encrypt: true, // For Azure SQL Managed instances
              trustServerCertificate: true, // For Azure SQL Managed instances
            },
          },
        }
      );
      let databases = [];
      let RestoreData = [];
      await sequelize
        .query("SELECT name FROM sys.databases", {
          type: QueryTypes.SELECT,
        })
        .then((dbs) => {
          for (let database of dbs) {
            databases.push(database.name);
          }
        })
        .catch((error) => {
          console.error("Error getting databases", error);
        });
  
      sequelize.close();
      databases = databases.filter((name) => {
        return !["master", "tempdb", "model", "msdb"].includes(name);
      });
      let results = [];
      for (let database of databases) {
        const db = new Sequelize(
          `${database}`,
          `${server.username}`,
          `${server.password}`,
          {
            dialect: "mssql",
            host: `${server.host}`,//localhost
            port: `${server.port}`,//1433
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
          `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_CATALOG='${database}'`,
          { type: Sequelize.QueryTypes.SELECT }
        );
        //[ { TABLE_NAME: 'users' }, { TABLE_NAME: 'goodPeople' } ]
        let tables = [];
        tablesFounded.map((table) => {
          tables.push(table.TABLE_NAME);
        });
        //[ 'users', 'goodPeople' ]
        let query = ``;
        let queryH;
        for (let table of tables) {
          query = `delete from ${table} where ` + data + ";";
          queryH = `select * from ${table} where ` + data + ";";
          const his = await db.query({
            query: queryH,
            type: Sequelize.QueryTypes.SELECT,
          });
  
          await db
            .query({
              query: query,
              type: Sequelize.QueryTypes.DELETE,
            })
            .then((result) => {
              //newDB goodPeople [ [ { cin: 'cin1', email: 'houssam@gmail.com' } ], 1 ]
              results.push({
                affectedRow: result[1],
                table: table,
                database: database,
                type: "sqlserver",
              });
              if (result[1] > 0) {
                his[0].map((elm) => {
                  let tableSchema = {};
                  for (let key of Object.keys(elm)) {
                    tableSchema[key] = typeof elm[key];
                  }
                  RestoreData.push({
                    databaseType: "sqlserver",
                    databaseName: database,
                    tableName: table,
                    rowdeleted: elm,
                    tableSchema: tableSchema,
                    databasePara:{username:server.username,password:server.password,port:server.port,host:server.host}
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
      
      return results;
    } catch (err) {
      console.log(err);
    }
  }

  export const restoreToSqlServer = async (data,user)=>{
    try{
      let users =[]
  users = await getUsers(); if(users==undefined){
    users=[]
  }
      const db = new Sequelize(
        `${data.databaseName}`,
        `${data.databasePara.username}`,
        `${data.databasePara.password}`,
        {
          dialect: "mssql",
          host: `${data.databasePara.host}`,//localhost
          port: `${data.databasePara.port}`,//1433
          dialectOptions: {
            options: {
              encrypt: true, // For Azure SQL Managed instances
              trustServerCertificate: true, // For Azure SQL Managed instances
            },
          },
        }
      );
    await db.authenticate().then(()=>{
      console.log("connected to sqlServer database : ",data.databaseName)
    }).catch((err)=>{
      console.log(err)
    })
    let tbl="";
    let vls="";
    for(let i of Object.keys(data.rowdeleted)){
        if(tbl==""){
          tbl+=`${i}`
        }else{
          tbl+=`,${i}`
        }
        if(vls==""){
          vls+=`'${data.rowdeleted[i]}'`
        }else{
          vls+=`,'${data.rowdeleted[i]}'`
        }
    }    
    let query = `INSERT INTO ${data.tableName}(${tbl}) VALUES(${vls}) ;`;
    let results = await db.query({
      query: query,
      type: Sequelize.QueryTypes.INSERT
    });
    /*
    The first element, 0, typically represents the number of rows that were updated or modified by the query.
    The second element, 1, typically represents the number of rows that were inserted by the query.
    */ 
    if(results[1]>=1){
      //deleting from history
      for(let u of users){
        if(user.email==u.user.email){
       u.historique=u.historique.filter((el)=>!deepEqual(el,data))
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
      return {ok:"succes",message:"succés"}
    }else{
      return {ok:"failed",message:"failed"}
    }
    }catch(err){
      console.error(err)
      return  {ok:"failed",message:"failed"}
    }
  }

export const  add_sqlServer = async (elm, parametres, table)=>{
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
        dialect: "mssql",
        host: `${parametres.databasePara.host}`,//localhost
        port: `${parametres.databasePara.port}`,//1433
        dialectOptions: {
          options: {
            encrypt: true, // For Azure SQL Managed instances
            trustServerCertificate: true, // For Azure SQL Managed instances
          },
        },
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
  
    const result = await db.query(query);
    console.log("-------------------------", result[1]);
    return result[1];
  
   
  

  }catch(err){
    console.log(err)
    return -1;
  }
}

export const delete_sqlServer = async (elm, parametres, table,user)=>{
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
        dialect: "mssql",
        host: `${parametres.databasePara.host}`,//localhost
        port: `${parametres.databasePara.port}`,//1433
        dialectOptions: {
          options: {
            encrypt: true, // For Azure SQL Managed instances
            trustServerCertificate: true, // For Azure SQL Managed instances
          },
        },
      }
    );
    let query = `DELETE FROM ${table}  ${generateWhereClause(elm,"postgres","where")} ;`;
    
    const result = await db.query(query);
    console.log("-------------------------", result[1]);
    if (result[1]>0) {
      //saving historique
      let tableSchema = {};
      for (let key of Object.keys(elm)) {
        tableSchema[key] = typeof elm[key];
      }
      for (let i of users) {
        if (i.user.email == user.email) {
          i.historique.push({
            databaseType: "sqlserver",
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
    return result[1];
  }catch(err){
    console.log(err)
    return -1;
  }
}

export const update_sqlServer = async (data,parametres,table,primaryKey)=>{
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
        dialect: "mssql",
        host: `${parametres.databasePara.host}`,//localhost
        port: `${parametres.databasePara.port}`,//1433
        dialectOptions: {
          options: {
            encrypt: true, // For Azure SQL Managed instances
            trustServerCertificate: true, // For Azure SQL Managed instances
          },
        },
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
    console.log("updated Successfully: ", result);
    return result[1];
  }catch(err){
    console.log(err)
    return -1;
  }
}