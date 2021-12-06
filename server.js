/*
Rahul Seth
17302557

CSU44000 Internet Applications
Assignment#2 – A Simple Cloud Application

The objective of this assignment is to write a very simple client (employing Vue.js) interacting with a
server (implemented in Node.js) which in turn interacts with a Cloud-based Database (using AWS
DynamoDB) and an Object stored in the Object-store (using AWS S3)
Raw data concerning movies is stored in JSON format in an object store that I have set up at :

Region: EU(Ireland)
Bucket-Name:csu44000assignment220
Object Key (FileName):moviedata.json
*/
//----------------------------------------//----------------------------------------//

// importing required constraints 
"use strict";
const port = 3000;
var AWS = require("aws-sdk");
const express = require('express');
const path = require("path")
const cors = require("cors")
const { title } = require("process");
const request = require('request');
const app = express();
const BUCKET= "csu44000assignment220";
const FILE_LOCATION = "moviedata.json";
app.use(cors())
//----------------------------------------------------------//
var publicKey = "AKIASB2UNOY25X3IHVJW";
var privateKey = "Cjmbo3sJ7tZeElY1nR/4qyxwoxiFKEtzLXAZiaC8";
//----------------------------------------------------------//
// Variables & parameters used
var s3_movies;
const TABLE_PARAMS =  {
    TableName : "Movies",
    KeySchema: [       
        { AttributeName: "year", KeyType: "HASH"},  
        { AttributeName: "title", KeyType: "RANGE" }  
    ],
    AttributeDefinitions: [       
        { AttributeName: "year", AttributeType: "N" },
        { AttributeName: "title", AttributeType: "S" }
    ],
    ProvisionedThroughput: {       
        ReadCapacityUnits: 20, 
        WriteCapacityUnits: 20
    }
};
const del_params = {
    TableName : "Movies",
};
const BUCKET_PARAMS = {
    Bucket: BUCKET,
    Key: FILE_LOCATION,
};
//----------------------------------------------------------//
//AWS config
AWS.config.update({
    maxRetries: 5, 
    retryDelayOptions: {base: 500},
    httpOptions: {timeout: 30000, connectTimeout: 5000},
    region: 'eu-west-1',
    accessKeyId: publicKey,
    secretAccessKey: privateKey,
});
//----------------------------------------------------------//
var dynamodb = new AWS.DynamoDB({apiVersion: "2012-08-10"});
let s3 = new AWS.S3();
//----------------------------------------------------------//
//Loading up client
let pp = path.resolve(__dirname, "public")
app.use(express.static(pp))
app.get("/", function (req, res) {
    console.log("Server Starting now. \n")
    res.sendFile(path.join(__dirname + "/client.html"))
});
app.listen(port, function () {
    console.log("Movie App is listening on " +port)
});
//----------------------------------------------------------//
//----------------------------------------------------------//
//functions for creating & deleting a table
function createTable(){
    dynamodb.createTable(TABLE_PARAMS, function (err, data) {
        if (err) {
            console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
        } 
        else {
            console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
        }
    });
}
function destroyTable(){    
    dynamodb.deleteTable(del_params, function (err, data) {
        if (err) {
            console.error("Unable to delete table. Error JSON:", JSON.stringify(err, null, 2));
        } 
        else {
            console.log("Deleted Table succesfuuly.");
        }
    });
}
//----------------------------------------------------------//
//Creating Table
app.get('/createDB', (req, res) => {
    
    createTable();
    //populating database from s3 bucket
    s3.getObject(BUCKET_PARAMS, function(err, data) {
        if(err){
            console.log("Unable to reach s3 bucket.\n", err)
        }
        else{
            console.log("Data retreival successful.\n")
            s3_movies = JSON.parse(data.Body.toString());
            //console.log(s3_movies);
            s3_movies.forEach(function (movie)  {
                var s3_params = {
                    TableName: "Movies",
                    Item: {
                        "year":  movie.year,
                        "title": movie.title,
                        "release_date": movie.info.release_date,
                        "rank": movie.info.rank,
                        "rating": movie.info.rating
                    }
                };

                var docClient = new AWS.DynamoDB.DocumentClient();
                docClient.put(s3_params, function(err, data){
                    if(err){
                        console.log("Unable to add movie." + title, err);
                    }
                    else{
                        console.log("Movie added successfully: " + movie.title + " " + movie.year + " " + movie.info.rank + " " + movie.info.rating);
                    }
                });
                console.log("Done adding movies.\n")
            });
        }
    })
});
//----------------------------------------------------------//
//Querying Databse
app.get('/queryDB/:title/:year', (req, res) => {

    console.log("Querying Database.\n");
    var docClient = new AWS.DynamoDB.DocumentClient();
    var qData = {
        "movies": []
    };

    let year = parseInt(req.params.year);
    let rating = parseFloat(req.params.rating);
    let title = req.params.title;

    var params = {
        TableName: "Movies",
        KeyConditionExpression: "#yr = :yyyy and begins_with(title, :s)",
        ExpressionAttributeNames:{
            "#yr": "year"
        },
        ExpressionAttributeValues: {
            ":yyyy": year,
            ":s": title
        }
    };

    //quesrying here
    docClient.query(params, function(err, data)  {
        if(err){
            console.log("error quesrying database.\n");
        }
        else{
            console.log("Query Success.\n", JSON.stringify(data, null, 2));
            data.Items.forEach(function(item) {
                console.log(item);
                let movie = {"year": item.year, "title": item.title, "release_date": item.release_date, "rank": item.rank, "rating": item.rating}
                console.log("Printing movie car: \n");
                console.log(movie)
                qData.movies.push(movie);
            });

            console.log("printing data top be sent:\n")
            console.log(qData)
        }
        console.log("Test print")
        console.log(qData)
        res.send(qData)
    })
});

//----------------------------------------------------------//
//Destroying Table
app.get('/destroyDB', (req, res) => {
    destroyTable()
});
//----------------------------------------------------------//
//----------------------END--------------------------------//
