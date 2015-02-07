'use strict'

var request = require('request'),
    async = require('async'),
    restify = require('restify'),
    fs = require('graceful-fs'),
    http = require('http');

console.log(request);
http.globalAgent.maxSockets = 1000000;

var resourceConfig = {
                        "homepage": {
                            "resources": [{"name": "banner", "url": "http://127.0.0.1:1337/item"},
                            {"name": "products", "url": "http://127.0.0.1:1337/item"},
                            {"name": "categories", "url": "http://127.0.0.1:1337/item"},
                            {"name": "prices", "url": "http://127.0.0.1:1337/item"},
                            {"name": "chats", "url": "http://127.0.0.1:1337/item"},
                            {"name": "adverts", "url": "http://127.0.0.1:1337/item"},
                            {"name": "merchants", "url": "http://127.0.0.1:1337/item"},
                            {"name": "customers", "url": "http://127.0.0.1:1337/item"},
                            {"name": "guests", "url": "http://127.0.0.1:1337/item"},
                            {"name": "catalog", "url": "http://127.0.0.1:1337/item"}]
                        },

                        "about-us": {
                            "resources": [{"banner": "http://127.0.0.1:1337/item"},
                            {"products": "http://127.0.0.1:1337/item"}]
                        }
                    }


function serialRouter(req, res, next){
    console.time('serialRouter');
    fs.readFile('clients.json', function(err, data){
        if(data){
            var clients,
                resources,
                tasks = [],
                nameOfResources = [],
                combinedResults = {},
                locals = {};
            clients = JSON.parse(data.toString('utf-8'));

            resources = clients[req.params['name']]['resources'];

            resources.forEach(function(resource){
                nameOfResources.push(resource['name']);
                tasks.push(function(callback){
                    var url = resource['url'];
                    request(url, function(err, response, body){
                        if(err){
                            console.log(err);
                            callback(true);
                            return;
                        }
                        locals = JSON.parse(body);
                        callback(false, locals);
                    });
                });
            });

            async.series(tasks, function(err, results){
                if(err){
                    console.log(err);
                    res.json({status: 'success', code: '500', message: 'Server Error'});
                    return;
                }
                results.forEach(function(result){
                    nameOfResources.forEach(function(name){
                        combinedResults[name] = result;
                    });
                });

                console.timeEnd('serialRouter');
                res.json(combinedResults);
                next();
            });
        }else{
            res.json({status: 'success', code: '500', message: 'No configuration exists for resoursses'});
            next();
        }
    });
}

function router(req, res, next){
    console.time('parallelRouter');
    if(resourceConfig){
        var clients,
            resources,
            tasks = [],
            nameOfResources = [],
            combinedResults = {},
            locals = {};
        clients = resourceConfig;

        resources = clients[req.params['name']]['resources'];

        resources.forEach(function(resource){
            nameOfResources.push(resource['name']);
            tasks.push(function(callback){
                var url = resource['url'];
                request({'url': url}, function(err, response, body){
                    if(err){
                        console.log("Error from the server")
                        console.log(err);
                        callback(true);
                        return;
                    }
                    locals = JSON.parse(body);
                    callback(false, locals);
                });
            });
        });

        async.parallel(tasks, function(err, results){
            if(err){
                console.log(err);
                res.json({status: 'success', code: '500', message: 'Server Error'});
                return;
            }
            results.forEach(function(result){
                nameOfResources.forEach(function(name){
                    combinedResults[name] = result;
                });
            });

            console.timeEnd('parallelRouter');
            res.json(combinedResults);
            next();
        });
    }else{
        res.json({status: 'success', code: '500', message: 'No configuration exists for resoursses'});
        next();
    }
}


var server = restify.createServer();

server.get('/router/:name', router);
server.get('serial-router/:name', serialRouter);


server.listen(1339, function(){
    console.log('Router is now listening at %s :D', server.url);
});
