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
//----------------------------------------//
// importing required constraints 
var AWS = require("aws-sdk");
const express = require('express');
const path = require("path")
const fetch = require("node-fetch")
const app = express();
const port = 3000;
const BUCKET= "csu44000assignment220";
const FILE_LOCATION = "moviedata.json";

//AWS constraints
var publicKey = "AKIASB2UNOY25X3IHVJW";
var privateKey = "Cjmbo3sJ7tZeElY1nR/4qyxwoxiFKEtzLXAZiaC8";
//----------------------------------------//

//
var s3_movies;

// table parameters
const TABLE_PARAMS =  {
    TableName : "Movies",
    KeySchema: [       
        { AttributeName: "year", KeyType: "HASH"},  //Partition key
        { AttributeName: "title", KeyType: "RANGE" }  //Sort key
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

var params = {
    TableName : "Movies",
};

const BUCKET_PARAMS = {
    Bucket: BUCKET,
    Key: FILE_LOCATION,
};


//----------------------------------------//
//AWS config
AWS.config.update({
    maxRetries: 3,
    httpOptions: {timeout: 30000, connectTimeout: 5000},
    region: 'eu-west-1',
    accessKeyId: publicKey,
    secretAccessKey: privateKey,
});
//----------------------------------------//
// Create the Service interface for dynamoDB
var dynamodb = new AWS.DynamoDB({apiVersion: "2012-08-10"});
let s3 = new AWS.S3();


//----------------------------------------//
//Loading up client
let publicPath = path.resolve(__dirname, "public")
app.use(express.static(publicPath))
app.get("/", function (req, res) {
    console.log("Server Starting now. \n")
    res.sendFile(path.join(__dirname + "/client.html"))
})

app.listen(port, function () {
    console.log("Movie App is listening on " +port)
})
//----------------------------------------//



//Creating Table
app.get('/createDB', (req, res) => {

    //creating databse
    dynamodb.createTable(TABLE_PARAMS, function (err, data) {
        if (err) {
            console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
        } 
        else {
            console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
        }
    });

    //populating database from s3 bucket
    s3.getObject(BUCKET_PARAMS, function(err, data) {

        if(err){
            console.log("Unable to reach s3 bucket.\n", err)
        }
        else{
            console.log("Data retreival successful.\n")
            //console.log(data)
            s3_movies = JSON.parse(data.Body)

            s3_movies.forEach(function (movie)  {
                
                var s3_params = {
                    TableName: "Movies",
                    Item: {
                        "year":  movie.year,
                        "title": movie.title,
                        "release_date": movie.info.release_date,
                        "rank": movie.info.rank
                    }
                };

                var docClient = new AWS.DynamoDB.DocumentClient();

                docClient.put(s3_params, function(err, data){

                    if(err){
                        console.log("Unable to add movie.", err)
                    }
                    else{
                        console.log("Movie added successfully.")
                    }
                });


            });
        }
        console.log("success populating databse.\n")
    });
});

//Querying Databse


//Destroying Table
app.get('/destroyDB', (req, res) => {
    
    dynamodb.deleteTable(params, function (err, data) {
        if (err) {
            console.error("Unable to delete table. Error JSON:", JSON.stringify(err, null, 2));
        } 
        else {
            console.log("Deleted Table succesfuuly.");
        }
     });
});
