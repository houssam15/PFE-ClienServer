import { request, response } from "express";
import mongoose from "mongoose";
import { Sequelize, QueryTypes } from "sequelize";
import fs from "fs";
import xlsx from "xlsx";
import { exec } from "child_process";
import oracledb from "oracledb";
import { deepEqual } from "./other_services.js";
import {getUsers} from "./other_services.js"



export async function searchExcelFiles_service(data, database) {
  let users =[]
  users = await getUsers(); if(users==undefined){
    users=[]
  }
  let rows = [];
  let files;
  await new Promise((resolve, reject) => {
    exec(
      `dir /s /b "${database.directory}" | findstr /i "\\.xlsx$"`,
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
      console.log("err");
    });
  for (let file of files) {
    try {
      fs.accessSync(file, fs.constants.R_OK); // check read permissions
      const workbook = xlsx.readFile(file);
      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const sheetData = xlsx.utils.sheet_to_json(sheet);
        let foundRows = [];
        sheetData.map(
          (row) => {
            let flag = true;
            for (let i = 0; i < data.length; i++) {
              if (!Object.values(row).includes(data[i])) {
                flag = false;
                break;
              }
            }
            if (flag == true) {
              foundRows.push(row);
            }
          }
          //Object.values(row).includes(data[0])
        );

        if (foundRows.length > 0) {
          rows = rows.concat({ foundRows: foundRows, filePath: file }); // concatenate the found rows
          //console.log(rows)
        }
      });
    } catch (err) {
      console.log(err);
    }
  }
  return rows;
}

export async function deleteFromExcel(data, server, user) {
  try {
    let users =[]
    users = await getUsers(); if(users==undefined){
    users=[]
  }
    const directory = server.directory;
    let files;
    let final_results = [];
    let RestoreData = [];
    await new Promise((resolve, reject) => {
      exec(
        `dir /s /b "${directory}" | findstr /i "\\.xlsx$"`,
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
        console.log("err", err);
      });
    let cnt = 0;
    let c;
    for (let file of files) {
      try {
        fs.accessSync(file, fs.constants.R_OK); // check read permissions
        const workbook = xlsx.readFile(file);
        const updatedWorkBook = xlsx.utils.book_new(); // create a new workbook
        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const sheetData = xlsx.utils.sheet_to_json(sheet);
          let foundRows = [];
          sheetData.map((row) => {
            let flag = false;
            for (let i = 0; i < data.length; i++) {
              if (!Object.values(row).includes(data[i])) {
                flag = true;
                break;
              } else {
                let tableSchema = {};
                for (let key of Object.keys(row)) {
                  tableSchema[key] = typeof row[key];
                }

                RestoreData.push({
                  databaseType: "excel",
                  databaseName: file,
                  tableName: "",
                  rowdeleted: row,
                  tableSchema: tableSchema,
                });
              }
            }
            if (flag == true) {
              foundRows.push(row);
            }
          });
          c = cnt;
          if (sheetData.length > foundRows.length) {
            cnt += sheetData.length - foundRows.length;
            //save history
          }

          const filtredsheet = xlsx.utils.json_to_sheet(foundRows);
          xlsx.utils.book_append_sheet(
            updatedWorkBook,
            filtredsheet,
            sheetName
          ); // add the filtered sheet to the new workbook
        });
        if (cnt - c > 0) {
          xlsx.writeFile(updatedWorkBook, file); // write the new workbook to the file
        }
      } catch (err) {
        console.log(err);
      }
    }
    final_results.push({
      affectedRow: cnt,
      type: "excel",
    });
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
  } catch (err) {
    console.log(err);
  }
}

export const restoreToExcel = async (data, user) => {
  try {
    let users =[]
    users = await getUsers(); if(users==undefined){
    users=[]
  }
    let files;
    await new Promise((resolve, reject) => {
      exec(
        `dir /s /b "${data.databaseName}" | findstr /i "\\.xlsx$"`,
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
        console.log("err", err);
      });
    let check = false;
    for (let file of files) {
      fs.accessSync(file, fs.constants.R_OK); // check read permissions
      const workbook = xlsx.readFile(file);
      const updatedWorkBook = xlsx.utils.book_new(); // create a new workbook
      workbook.SheetNames.filter((e) => e == data.tableName).forEach(
        (sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const sheetData = xlsx.utils.sheet_to_json(sheet);
          let len1 = sheetData.length;
          if (!sheetData.includes(JSON.stringify(data.rowdeleted))) {
            sheetData.push(data.rowdeleted);
          } else {
            return { ok: "failed", message:"failed" };
          }
          let len2 = sheetData.length;
          const updatesheet = xlsx.utils.json_to_sheet(sheetData);
          xlsx.utils.book_append_sheet(updatedWorkBook, updatesheet, sheetName); // add the filtered sheet to the new workbook
          if (len1 !== len2) {
            check = true;
          }
        }
      );
      xlsx.writeFile(updatedWorkBook, file);
    }

    if (check) {
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
      return { ok: "failed",message:"failed" };
    }
  } catch (err) {
    console.log(err);
    return { ok: "failed", message : "failed" };
  }
  
};

export const delete_excel =async (elm, parametres, table, user, mySheetName) => {
  try {
    let users =[]
    users = await getUsers(); if(users==undefined){
    users=[]
  }
    let RestoreData = [];
    let numdeleted = 0;
    console.log("-------------------------->", mySheetName)
    fs.accessSync(table, fs.constants.R_OK); // check read permissions
    const workbook = xlsx.readFile(table);
    const updatedWorkBook = xlsx.utils.book_new(); // create a new workbook
    let cnt = 0;
    
    workbook.SheetNames.forEach((sheetName) => {
      if (mySheetName === sheetName) {
        const sheet = workbook.Sheets[sheetName];
        let sheetData = xlsx.utils.sheet_to_json(sheet);
        let oldSheetData = sheetData;
        let row = sheetData.filter((e) => deepEqual(e, elm));
        sheetData = sheetData.filter((e) => !deepEqual(e, elm));
        const updatesheet = xlsx.utils.json_to_sheet(sheetData);
        cnt += 1;
        console.log("----------------------------------->", cnt)
        xlsx.utils.book_append_sheet(updatedWorkBook, updatesheet, sheetName);
        if (oldSheetData.length !== sheetData.length) {
          numdeleted = oldSheetData.length - sheetData.length;
          let tableSchema = {};
          row.map((r) => {
            for (let key of Object.keys(r)) {
              tableSchema[key] = "string";
            }
            RestoreData.push({
              databaseType: "excel",
              databaseName: table,
              tableName: sheetName,
              rowdeleted: r,
              tableSchema: tableSchema,
            });
          });

          for (let i of users) {
            if (i.user.email == user.email) {
              RestoreData.map((elm) => {
                i.historique.push(elm);
              });
            }
          }
        }
        
      } else {
        const sheet = workbook.Sheets[sheetName];
        xlsx.utils.book_append_sheet(updatedWorkBook, sheet, sheetName);
      }
    });

    xlsx.writeFile(updatedWorkBook, table);
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

    return numdeleted;
  } catch (err) {
    console.log(err);
    return -1;
  }
};


export const update_excel = (
  data,
  parametres,
  table,
  mySheetName,
  original
) => {
  try {
    let RestoreData = [];
    let numupdated = 0;
    fs.accessSync(table, fs.constants.R_OK); // check read permissions
    const workbook = xlsx.readFile(table);
    const updatedWorkBook = xlsx.utils.book_new(); // create a new workbook
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      let sheetData = xlsx.utils.sheet_to_json(sheet);
      if(sheetName==mySheetName){
        let row = sheetData.filter((e) => deepEqual(e, original));
        const index = sheetData.findIndex((e) => deepEqual(e, original));
        for (let key in data) {
          if (data.hasOwnProperty(key) && original.hasOwnProperty(key)) {
            if (data[key] !== original[key]) {
              original[key] = data[key];
            }
          }
        }
        sheetData[index] = original;
        if (row != original) {
          numupdated += 1;
        }
      }
     
      const updatesheet = xlsx.utils.json_to_sheet(sheetData);
      xlsx.utils.book_append_sheet(updatedWorkBook, updatesheet, sheetName);
     
    });
    console.log(updatedWorkBook.SheetNames)
    xlsx.writeFile(updatedWorkBook, table);
    return numupdated;
  } catch (err) {
    console.log(err);
    return -1;
  }
};

export const add_excel = (elm, table, mySheetName) => {
  try {
    let taille1 = 0;
    let taille2 = 0;
    console.log(elm, table, mySheetName);
    fs.accessSync(table, fs.constants.R_OK); // check read permissions
    const workbook = xlsx.readFile(table);
    const updatedWorkBook = xlsx.utils.book_new(); // create a new workbook
    const typeOfMyShhetName = typeof mySheetName;
    if (typeOfMyShhetName == "object" && mySheetName.sheetName != undefined) {
      if (
        !workbook.SheetNames.includes(mySheetName.sheetName) &&
        mySheetName.dejaexist == true
      ) {
        // Create a new sheet
        const newSheetName = mySheetName.sheetName;
        const newSheetData = elm; // Example data for the new sheet

        const tableData = Object.entries(newSheetData);
        const headers = tableData.map(([key, value]) => key);
        const rows = [headers];
        rows.push(tableData.map(([key, value]) => value));
        const newSheet = xlsx.utils.aoa_to_sheet(rows);
        xlsx.utils.book_append_sheet(workbook, newSheet, newSheetName);
        xlsx.writeFile(workbook, table);
        return 1;
      } else if (
        !workbook.SheetNames.includes(mySheetName.sheetName) &&
        mySheetName.dejaexist == false
      ) {
        return -2;
      } else if (workbook.SheetNames.includes(mySheetName.sheetName)) {
        const sheet = workbook.Sheets[mySheetName.sheetName];
        let sheetData = xlsx.utils.sheet_to_json(sheet);
        if (sheetData.length != 0) {
          return -3;
        }
      }
      mySheetName = mySheetName.sheetName;
    }
    console.log("workbook.SheetNames==================> ", workbook.SheetNames);
    workbook.SheetNames.filter((e) => mySheetName == e).forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      let sheetData = xlsx.utils.sheet_to_json(sheet);
      taille1 = sheetData.length;
      sheetData.push(elm);
      taille2 = sheetData.length;
      const updatesheet = xlsx.utils.json_to_sheet(sheetData);
      xlsx.utils.book_append_sheet(updatedWorkBook, updatesheet, sheetName);
      if (taille2 - taille1 == 1) {
        xlsx.writeFile(updatedWorkBook, table);
      }
    });
    return taille2 - taille1;
  } catch (err) {
    console.log(err);
    return -1;
  }
};
