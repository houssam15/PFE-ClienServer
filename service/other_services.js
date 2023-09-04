import { request, response } from "express";
import mongoose from "mongoose";
import { Sequelize, QueryTypes } from "sequelize";
import fs from "fs";
import xlsx from "xlsx";
import { exec } from "child_process";
import oracledb from "oracledb";


export  async function cardesInfo(email){
    try{
      
      let users =[]
      users = await getUsers(); if(users==undefined){
    users=[]
  }
let numMaxDel ; 
let remaining;
let numberDeleted;
       for(let i of users){
        if(i.user.email==email){
            numberDeleted = i.maxSuppresion.suppression;
            remaining = i.maxSuppresion.max-numberDeleted;
            numMaxDel = i.maxSuppresion.max
            
        }
    }
       return {maxDel: numMaxDel,remaining:remaining,numberDeleted:numberDeleted};
    }
    catch(err){
        console.log(err)
    }
}

export function deepEqual(obj1, obj2) {
    if (obj1 === obj2) {
      return true;
    }
  
    if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
      return false;
    }
  
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
  
    if (keys1.length !== keys2.length) {
      return false;
    }
  
    for (let key of keys1) {
      if (!deepEqual(obj1[key], obj2[key])) {
        return false;
      }
    }
  
    return true;
  }


 export function groupBySchema(array) {
    const groupedArray = [];
    const schemaMap = new Map();
  
    for (const obj of array) {
      const keys = Object.keys(obj).sort();
      const schemaKey = keys.join(',');
  
      if (schemaMap.has(schemaKey)) {
        schemaMap.get(schemaKey).push(obj);
      } else {
        schemaMap.set(schemaKey, [obj]);
      }
    }
  
    for (const values of schemaMap.values()) {
      const schema = Object.keys(values[0]).sort();
      groupedArray.push({ values, schema });
    }
  
    return groupedArray;
  }
  
  export function convertSingleQuotesToDoubleQuotes(obj) {
    if (typeof obj !== "object" || obj === null) {
      // Return the input if it's not an object or null
      return obj;
    }
  
    const result = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (typeof value === "string" && value.includes("'")) {
          // Replace single quotes with double quotes in the string value
          result[key] = value.replace(/'/g, '"');
        } else {
          // Keep the value as is if it's not a string with single quotes
          result[key] = value;
        }
      }
    }
  
    return result;
  }
  

  export const  getUsers=async()=>{
    try {
      const filePath = '../users.json';
      const data =  fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Error hhh JSON file:', err);
    }
  }