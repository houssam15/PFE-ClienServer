import { request, response } from "express";
import mongoose from "mongoose";
import { Sequelize, QueryTypes } from "sequelize";
import fs from "fs";
import xlsx from "xlsx";
import { exec } from "child_process";
import oracledb from "oracledb";
import { deepEqual } from "./other_services.js";
import {getUsers} from "./other_services.js"



export const sendlastOperations_service =async (req, res) => {
  let users =[]
  users = await getUsers(); if(users==undefined){
    users=[]
  }
    let email = req.query.email;
    for (let i of users) {
      if (i.user.email == email) {
        return res.status(200).json(i.lastOperations);
      }
    }
    if(users!=[]){
      await fs.writeFileSync("../users.json", JSON.stringify(users), (err) => {
        if (err) throw err;
      });
    }
};

export const sendHistory_service =async (req, res) => {
  let users =[]
  users = await getUsers(); if(users==undefined){
    users=[]
  }
    let email = req.query.email;
    for (let i of users) {
      if (i.user.email == email) {
        return res.status(200).json(i.historique);
      }
    }
    if(users!=[]){
      await fs.writeFileSync("../users.json", JSON.stringify(users), (err) => {
        if (err) throw err;
      });
    }
};

export const deleteHistory_service = async (data)=> {
  try{
    let users =[]
    users = await getUsers(); if(users==undefined){
    users=[]
  }
    console.log(data.data)  
    for(let u of users){
      if(u.user.email==data.user.email){
        for(let obj of data.data){
          u.historique = u.historique.filter((elm)=>!deepEqual(elm,obj))
        }
      }
      
    }
    
    if(users!=[]){
      await fs.writeFileSync("../users.json", JSON.stringify(users), (err) => {
        if (err) throw err;
      });
    }
    return 1;
  }catch(err){
    console.log(err) 
    return -1;
  }
  
  
  
}