import { request, response } from "express";
import mongoose from "mongoose";
import { Sequelize, QueryTypes } from "sequelize";
import fs from "fs";
import xlsx from "xlsx";
import { exec } from "child_process";
import oracledb from "oracledb";


export async function connectToOracle_service( recherche, database) {
    try {
      let databases = [];
      const sequelize = new Sequelize({
        dialect: "oracle",
        dialectModule: oracledb,
        host: "localhost",
        port: 1521,
        database: "testdb",
        username: `sys`,
        password: `system`,
  
        define: {
          timestamps: false,
        },
        logging: false,
        dialectModule:require("oracledb")
      });
  
      sequelize
        .authenticate()
        .then(() => {
          console.log("Connection to oracle has been established successfully.");
        })
        .catch((err) => {
          console.error("Unable to connect to the database:", err);
        });
      //get all databases name
      //     const result = await sequelize.query(`
      // SELECT DISTINCT TABLESPACE_NAME
      // FROM ALL_TABLES
      // `);
      //     databases = result[0].map((row) => row.TABLESPACE_NAME);
      //     //[  'USERS' ]
      //     databases = databases.filter((name) => {
      //       return !["SYSTEM", "SYSAUX", null].includes(name);
      //     });
      //     //[ 'USERS' ]
  
      //     sequelize.close();
      //     console.log(databases);
      //     for (let database of databases) {
      //       const db = new Sequelize({
      //         dialect: "oracle",
      //         dialectModule: oracledb,
      //         host: "localhost",
      //         port: 1521,
      //         database: `${database}`,
      //         username: `${database.username}`,
      //         password: `${database.password}`,
      //         define: {
      //           timestamps: false,
      //         },
      //         logging: false,
      //       });
      //       await db
      //         .authenticate((res) => {
      //           console.log("connected succesfuly");
      //         })
      //         .catch((err) => console.log("error in " + err));
      //       let allTables = await db.query("SELECT table_name FROM all_tables", {
      //         type: Sequelize.QueryTypes.SELECT,
      //       });
      //       console.log(allTables);
      //       db.close();
      //     }
  
      //get all table in db
    } catch (err) {
      console.log("error in methode ConnectingToOracle : " + err);
    }
  }


  export  async function deleteFromOracle( recherche, server) {
    try {
    } catch (err) {
      console.log(err);
    }
  }