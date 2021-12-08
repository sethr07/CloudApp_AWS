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
const port = 3000; //port serving localhost
var AWS = require("aws-sdk"); // for using dynamdb through aws cli
const express = require('express'); // using express 
const path = require("path")
const cors = require("cors")
const app = express();
const BUCKET= "csu44000assignment220";
const FILE_LOCATION = "moviedata.json";
app.use(cors())
//----------------------------------------------------------//
var publicKey = "";
var privateKey = "";
//----------------------------------------------------------//
// Variables & parameters used
var s3_movies; //to store movie data from s3 bucket
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
        ReadCapacityUnits: 1, 
        WriteCapacityUnits: 1
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
    maxRetries: 5, // for provisoin throughput error
    retryDelayOptions: {base: 500}, // for provisoin throughput error
    httpOptions: {timeout: 30000, connectTimeout: 5000}, // for provisoin throughput error
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
    //creating table
    createTable();
    //populating database from s3 bucket
    s3.getObject(BUCKET_PARAMS, function(err, data) {
        if(err){
            console.log("Unable to reach s3 bucket.\n", err)
        }
        else{
            console.log("Connection to s3 success. Starting Data retreival.\n")
            s3_movies = JSON.parse(data.Body.toString());
            //Storing movies from s3 bucket to table
            //I used 5 subfields - year, title, rank, rating, release date  
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
            });
        }
    })
});
//----------------------------------------------------------//
//Querying Databse
app.get('/queryDB/:title/:year/:rating', (req, res) => {

    console.log("Querying Database.\n");
    var docClient = new AWS.DynamoDB.DocumentClient();
    //for storing query data
    var client_Data = {
        "movies": []
    };
    //parsing out the 3 parameters for query
    let year = parseInt(req.params.year); // user entered year
    let user_rating = parseFloat(req.params.rating); // user entered rating
    let title = req.params.title; //user entered title

    //Query Parameters 
    //Query starts with finding out movies in the enterd year.
    //It then filters the movies according to the entered title or string
    var query_params = {
        TableName: "Movies",    
        KeyConditionExpression: "#yr = :yyyy and begins_with(title, :t)",
        ExpressionAttributeNames:{
            "#yr": "year"
        },
        ExpressionAttributeValues: {
            ":yyyy": year,
            ":t": title
        }
    };
    //querying here
    docClient.query(query_params, function(err, data)  {
        if(err){
            console.log("Error querying database.\n");
        }
        else{
            console.log("Query Success.\n", JSON.stringify(data, null, 2));
            //This is the third step in filtering out the movies. 
            //It only stores movies with the rating higher than the entered ratiing
            //Then storoes movies which are then sent to the client
            data.Items.forEach(function(item) {
                if(item.rating >= user_rating){ 
                    console.log(item); //search result
                    let movie = {"year": item.year, "title": item.title, "release_date": item.release_date, "rank": item.rank, "rating": item.rating}
                    console.log("Adding item to client data: ", movie);
                    console.log("\n")
                    client_Data.movies.push(movie); //adding to list
                }
            });

            if(client_Data != undefined){
                console.log("No search results.\n");
            }

            console.log("Printing Data to be sent:\n")
            console.log(client_Data)
        }
        res.send(client_Data)
    })
});
//----------------------------------------------------------//
//Destroying Table
app.get('/destroyDB', (req, res) => {
    destroyTable()
});
//----------------------------------------------------------//
//----------------------END--------------------------------//
