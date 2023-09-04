
import { request, response } from "express";
import mongoose from "mongoose";
import { Sequelize, QueryTypes } from "sequelize";
import fs from "fs";
import xlsx from "xlsx";
import { exec } from "child_process";
import oracledb from "oracledb";
import dotenv from 'dotenv';
import {getUsers} from "./other_services.js"
dotenv.config();



export async function Login_service(req, res) {
  let users =[]
  users = await getUsers(); if(users==undefined){
    users=[]
  } if(users==undefined){
    users=[]
  }
  console.log("-------------------->",users)
    const login = req.body;
    let v;
    let flag=false
    for (let user of users) {
      if (user.user.email == login.email) {
        v = user;
        if(user.maxSuppresion.max==user.maxSuppresion.suppression){
            flag=true
        }
        break;
      }
    }
    
    if (v == undefined) {
      return res.status(200).json({ result: "-1" });
    } else {
      if (v.user.password == login.password) {
        if(flag==true){
          return res.status(200).json({ result: "1", user: v.user ,activated:v.activated});
                }
                
        return res.status(200).json({ result: "1", user: v.user ,activated:v.activated});
      } else {
        return res.status(200).json({ result: "-2" });
      }
    }
  }
  export async function CreateAcount_service(req, res) {
    let users =[]
  users = await getUsers(); if(users==undefined){
    users=[]
  } if(users==undefined){
    users=[]
  }
 
    let acount = req.body;
    console.log(users)
    // Assuming `users` is defined and contains your existing user data
    
    for (let v of users) {
  
      if (v.user.email == acount.email) {
        return res.status(200).send("-1");
      }
    }
    
    let newAcount = {
      user: {
        username: acount.username,
        password: acount.password,
        email: acount.email,
      },
      historique: [],
      lastOperations: [],
      databases:[],
      maxSuppresion: { max:parseInt(process.env.MAX, 10), suppression: 0 },
      activated:false
    };
  
    // Adding the serial number
    users.push(newAcount);
  
    if(users!=[]){
      await fs.writeFileSync("../users.json", JSON.stringify(users), (err) => {
        if (err) throw err;
      });
    }
  
    return res.status(200).send("1");
  }