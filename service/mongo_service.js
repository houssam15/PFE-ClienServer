import { request, response } from "express";
import mongoose from "mongoose";
import { Sequelize, QueryTypes } from "sequelize";
import fs from "fs";
import xlsx from "xlsx";
import { exec } from "child_process";
import oracledb from "oracledb";
import { deepEqual } from "./other_services.js";
import {convertSingleQuotesToDoubleQuotes} from "./other_services.js"
import {  ObjectId } from 'mongodb';
import {getUsers} from "./other_services.js"


export const connectToMongo_service = async (data, server) => {

  try {
    let users =[]
    users = await getUsers(); if(users==undefined){
    users=[]
  }
    let databases = [];
    let results = [];
    let Autothification = false;
    //"mongodb://127.0.0.1:27017/"
    await mongoose
      .connect(`${server.connectionString}/`, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        autoCreate: false,
      })
      .then(() => {
        console.log("MONGO connected successfully");
      })
      .catch((err) => {
        Autothification = true;

        console.log("Unable to connect to the Server:" + err);
      })
    if (Autothification) {
      return -1;
    }
    const adminDb = mongoose.connection.db.admin();
    const dbList = await adminDb.listDatabases();
    for (let i = 0; i < dbList.databases.length; i++) {
      if (
        dbList.databases[i].name != "admin" &&
        dbList.databases[i].name != "config" &&
        dbList.databases[i].name != "local"
      ) {
        databases.push(dbList.databases[i].name);
      }
    }
    
    for (let i = 0; i < databases.length; i++) {
      let collectionsName = [];
      try {
        const connectionToDB = await mongoose.createConnection(
          `${server.connectionString}/${databases[i]}`
        );

        
        connectionToDB.on('error', (error) => {
          console.error('Connection error:', error);
      });
      
      connectionToDB.on('connected', () => {
          console.log('Connected to the database');
      });
      
      connectionToDB.on('disconnected', () => {
          console.log('Disconnected from the database');
      });
        await new Promise((resolve) => connectionToDB.once("open", resolve));
        const collections = await connectionToDB.db.listCollections().toArray();
        for (let j = 0; j < collections.length; j++) {
          collectionsName.push(collections[j].name);
        }
        let values = [];
        console.log("_______________________", collectionsName);
        for (const nameCollection of collectionsName) {
          const newCollection = connectionToDB.collection(nameCollection);
          let docs;
          docs = await newCollection.find(data).toArray();
          values.push({
            tableName: nameCollection,
            docs: docs,
          });
        }
        results.push({
          database: databases[i],
          values: values,
        });
        await connectionToDB.close();
      } catch (err) {
        console.log(err);
      }
    }
    return results;
  } catch (error) {
    console.log(
      "Error while connecting to databases in MongoDB server!!! : " + error
    );
  }
};

export const deleteFromMongo = async (recherche, server, user) => {
  try {
    let users =[]
    users = await getUsers(); if(users==undefined){
    users=[]
  }
    let databases = [];
    let results = [];
    let RestoreData = [];
    await mongoose
      .connect(`${server.connectionString}/`, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        autoCreate: false,
      })
      .then(() => {
        console.log("MONGO connected successfully");
      });

    const adminDb = mongoose.connection.db.admin();
    const dbList = await adminDb.listDatabases();

    for (let i = 0; i < dbList.databases.length; i++) {
      if (
        dbList.databases[i].name != "admin" &&
        dbList.databases[i].name != "config" &&
        dbList.databases[i].name != "local"
      ) {
        databases.push(dbList.databases[i].name);
      }
    }

    for (let i = 0; i < databases.length; i++) {
      let collectionsName = [];
      try {
        const connectionToDB = await mongoose.createConnection(
          `${server.connectionString}/${databases[i]}`
        );
        await new Promise((resolve) => connectionToDB.once("open", resolve));
        const collections = await connectionToDB.db.listCollections().toArray();
        for (let j = 0; j < collections.length; j++) {
          collectionsName.push(collections[j].name);
        }
        let values = [];
        for (const nameCollection of collectionsName) {
          const newCollection = connectionToDB.collection(nameCollection);
          let data = await newCollection.find(recherche).toArray();
          console.log("-------------recherche-------------- : ", recherche);
          let docs = await newCollection.deleteMany(recherche);
          results.push({
            affectedRow: docs.deletedCount,
            table: nameCollection,
            database: databases[i],
            type: "mongo",
          });
          if (docs.deletedCount > 0) {
            data.map((elm) => {
              let tableSchema = {};

              //deleting _id from elm
              delete elm["_id"];
              for (let key of Object.keys(elm)) {
                if (key == "_id") {
                  continue;
                }
                tableSchema[key] = typeof elm[key];
              }
              RestoreData.push({
                databaseType: "mongo",
                databaseName: databases[i],
                tableName: nameCollection,
                rowdeleted: elm,
                tableSchema: tableSchema,
                databasePara:{connectionString:server.connectionString}
              });
            });
          }
        }
        await connectionToDB.close();
      } catch (err) {
        console.log(err);
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
    return results;
  } catch (error) {
    console.log(
      "Error while connecting to databases in MongoDB server!!! : " + error
    );
    return response.status(500).json({ error: error.message });
  }
};


export const restoreToMongo =async (data,user)=>{
  try{
    let users =[]
    users = await getUsers(); if(users==undefined){
    users=[]
  }
      const connectionToDB = await mongoose.createConnection(
        `${data.databasePara.connectionString}/${data.databaseName}`
      );
      const Collection = connectionToDB.collection(data.tableName);
      const result = await Collection.insertOne(data.rowdeleted);
      delete data.rowdeleted._id;
      console.log(data)
      if(result.insertedId!==""){
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
        return {ok:"succes",message :"succés"}
      }else{
        return {ok:"failed",message:"failed"}
      }
  }catch(err){
    console.log(err)
  }
}


export const delete_mongo = async(elm, parametres, table,user)=>{
  try{
    let users =[]
    users = await getUsers(); if(users==undefined){
    users=[]
  }
    const connectionToDB = await mongoose.createConnection(
      `${parametres.databasePara.connectionString}/${parametres.databaseName}`
    );

    await new Promise((resolve) => connectionToDB.once("open", resolve));
    const newCollection = connectionToDB.collection(table);
    delete elm._id;
    let result = await newCollection.deleteOne(elm);
    if (result.deletedCount >= 1) {
      //saving historique
      let tableSchema = {};
      for (let key of Object.keys(elm)) {
        tableSchema[key] = typeof elm[key];
      }
      for (let i of users) {
        if (i.user.email == user.email) {
          i.historique.push({
            databaseType: "mongo",
            databaseName: `${parametres.databaseName}`,
            tableName: `${table}`,
            rowdeleted: elm,
            tableSchema: tableSchema,
            databasePara: {
              connectionString : parametres.databasePara.connectionString
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
    return result.deletedCount;
  }catch(err){
    console.log(err)
    return -1;
  }
}

export const update_mongo = async (data,parametres,table,primaryKey) =>{
  try{
    let users =[]
    users = await getUsers(); if(users==undefined){
    users=[]
  }
    const connectionToDB = await mongoose.createConnection(
      `${parametres.databasePara.connectionString}/${parametres.databaseName}`
    );

     await new Promise((resolve) => connectionToDB.once("open", resolve));
     const newCollection = connectionToDB.collection(table);
     let id = data._id;
     delete data._id;
     const update = { $set: data }; 
    
     const result = await newCollection.updateOne({ _id:new ObjectId(`${id}`) }, update);
     return result.modifiedCount
  }catch(err){
    console.log(err)
    return -1;
  }
}


export const add_mongo = async (elm, parametres, table) => {
try{
  let users =[]
  users = await getUsers(); if(users==undefined){
    users=[]
  }
  console.log(elm)
  const connectionToDB = await mongoose.createConnection(
    `${parametres.databasePara.connectionString}/${parametres.databaseName}`
  );
  await new Promise((resolve) => connectionToDB.once("open", resolve));
  const newCollection = connectionToDB.collection(table);
//delete this code
  let indexes =[];
  
  indexes=await newCollection.getIndexes();
  console.log(indexes)
const uniqueIndexes = Object.keys(indexes)
/*************** */
  const result = await newCollection.insertOne(elm)
  return {id:result.insertedId,primarykeys:uniqueIndexes}
}catch(err){
  console.log(err)
  return -1;
}
}
