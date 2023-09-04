import { request, response } from "express";
import mongoose from "mongoose";
import { Sequelize, QueryTypes } from "sequelize";
import fs from "fs";
import xlsx from "xlsx";
import { exec } from "child_process";
import oracledb from "oracledb";



export const queryMaker_service = async (recherche) => {
    let querys = {
      mysql: "",
      mongo: {},
      postgres: "",
      sqlserver: "",
      oracle: "",
      excel: [],
    };
  
    if (recherche.email != "") {
      querys.mysql = `email = "${recherche.email}"`;
      querys.mongo.email = recherche.email;
      querys.postgres = `email = '${recherche.email}'`;
      querys.sqlserver = `email = '${recherche.email}'`;
      querys.oracle = `email = "${recherche.email}"`;
      querys.excel.push(recherche.email);
    }
    if (recherche.nom != "") {
      if (querys.mysql != "") {
        querys.mysql += ` and nom="${recherche.nom}"`;
      } else {
        querys.mysql = `nom="${recherche.nom}"`;
      }
      if (querys.postgres != "") {
        querys.postgres += ` and nom='${recherche.nom}'`;
      } else {
        querys.postgres = `nom='${recherche.nom}'`;
      }
      if (querys.sqlserver != "") {
        querys.sqlserver += ` and nom='${recherche.nom}'`;
      } else {
        querys.sqlserver = `nom='${recherche.nom}'`;
      }
      if (querys.oracle != "") {
        querys.oracle += ` and nom="${recherche.nom}"`;
      } else {
        querys.oracle = `nom="${recherche.nom}"`;
      }
      querys.mongo.nom = recherche.nom;
      querys.excel.push(recherche.nom);
    }
    if (recherche.prenom != "") {
      if (querys.mysql != "") {
        querys.mysql += ` and prenom="${recherche.prenom}"`;
      } else {
        querys.mysql = `prenom="${recherche.prenom}"`;
      }
      if (querys.postgres != "") {
        querys.postgres += ` and prenom='${recherche.prenom}'`;
      } else {
        querys.postgres = `prenom='${recherche.prenom}'`;
      }
      if (querys.sqlserver != "") {
        querys.sqlserver += ` and prenom='${recherche.prenom}'`;
      } else {
        querys.sqlserver = `prenom='${recherche.prenom}'`;
      }
      if (querys.oracle != "") {
        querys.oracle += ` and prenom="${recherche.prenom}"`;
      } else {
        querys.oracle = `prenom="${recherche.prenom}"`;
      }
      querys.mongo.prenom = recherche.prenom;
      querys.excel.push(recherche.prenom);
    }
    if (recherche.telephone != "") {
      if (querys.mysql != "") {
        querys.mysql += ` and telephone="${recherche.telephone}"`;
      } else {
        querys.mysql = `telephone="${recherche.telephone}"`;
      }
      if (querys.postgres != "") {
        querys.postgres += ` and telephone='${recherche.telephone}'`;
      } else {
        querys.postgres = `telephone='${recherche.telephone}'`;
      }
      if (querys.sqlserver != "") {
        querys.sqlserver += ` and telephone='${recherche.telephone}'`;
      } else {
        querys.sqlserver = `telephone='${recherche.telephone}'`;
      }
      if (querys.oracle != "") {
        querys.oracle += ` and telephone="${recherche.telephone}"`;
      } else {
        querys.oracle = `telephone="${recherche.telephone}"`;
      }
      querys.mongo.telephone = recherche.telephone;
      querys.excel.push(recherche.telephone);
    }
    return querys;
  };
  

  export function generateWhereClause(obj, type,mode) {
    if (type === "mysql") {
      if(mode=="where"){
        const conditions = Object.entries(obj)
        .filter(([key, value]) => value !== null) // Filter out null values
        .map(([key, value]) => `${key} = "${value}"`);
      return ` where ${conditions.join(" AND ")}`;
      }else if(mode=="set"){
        const conditions = Object.entries(obj)
        .filter(([key, value]) => value !== null) // Filter out null values
        .map(([key, value]) => `${key} = "${value}"`);
      return ` ${conditions.join(" , ")}`;
      }
      
    } else if (type === "postgres") {
      if(mode=="where"){
        const conditions = Object.entries(obj)
        .filter(([key, value]) => value !== null) // Filter out null values
        .map(([key, value]) => `${key} = '${value}'`);
        return ` where ${conditions.join(" AND ")}`;
      }else if(mode=="set"){
        const conditions = Object.entries(obj)
        .filter(([key, value]) => value !== null) // Filter out null values
        .map(([key, value]) => `${key} = '${value}'`);
        return ` ${conditions.join(" , ")}`;
      }
    }
  }
 
  
  