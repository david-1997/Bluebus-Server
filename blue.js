const express = require('express');
const mongoClient = require('mongodb');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(bodyParser.json())
app.use(cors())

let url = "mongodb+srv://david:david@1997@cluster0-o20vy.mongodb.net/MovieDB?retryWrites=true&w=majority";

let saltRound = 10;

//passenger

function authenticatePassenger(req, res, next) {
    var token = req.header("Authorization");
    console.log(token);
    if (token == undefined) {
        res.status(401).json({
            message: 'unauthorized'
        });

    }
    else {
        var decode = jwt.verify(token, 'abcdefhbjkanjfnaf');
        console.log(decode);
        if (decode !== undefined) {
            next();
        }
        else {
            res.status(401).json({
                message: 'unauthorized'
            });
        }
    }
}

app.post("/signup/passenger/", (req, res) => {
    console.log(req.body);
    const user = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        phone: req.body.phone,
        ticketsBooked: []
    }
    bcrypt.genSalt(saltRound, (err, salt) => {
        console.log(salt);
        bcrypt.hash(req.body.password, salt, (err, hash) => {
            console.log(hash);
            user.password = hash;
            mongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
                if (err) throw err;
                let db = client.db('bluebus');
                db.collection('bluePassenger').findOne({ "email": req.body.email }, (err, data) => {
                    if (err) throw err;
                    if (!data) {
                        db.collection('bluePassenger').insertOne(user, (err, data) => {
                            if (err) throw err;
                            client.close();

                            res.json(data)
                        })
                    }
                    else {
                        client.close();
                        res.json({
                            message: 'user already exists'
                        })
                    }
                })
            })
        })
    })
})

app.post('/login/passenger', (req, res) => {
    console.log('hello')
    mongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
        if (err) throw err;
        const userData = {
            email: req.body.email,
            password: req.body.password
        };

        var db = client.db('bluebus');

        db.collection('bluePassenger').findOne({ email: userData.email }, (err, data) => {
            if (err) throw err;
            bcrypt.compare(userData.password, data.password, (err, value) => {
                if (err) throw err;
                if (value) {
                    let jwtToken = jwt.sign({ email: userData.email }, "abcdefhbjkanjfnaf");
                    client.close();
                    res.json({
                        message: "Logged In",
                        token: jwtToken,
                        name: userData.name
                    })
                }
                else {
                    client.close();
                    res.json({
                        message: 'login failed'
                    })
                }
            })
        })
    })
})

app.get('/passenger/getusername/:email', (req, res) => {
    mongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
        let db = client.db('bluebus');
        db.collection('bluePassenger').findOne({ email: req.params.email }, (err, data) => {
            if (err) throw err;
            client.close();
            console.log(data);
            res.json({
                name: data.name
            })
        })
    })
})

app.get('/passenger/viewprofile/:email', (req, res) => {
    mongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
        if (err) throw err;
        let db = client.db('bluebus');
        db.collection('bluePassenger').findOne({ 'email': req.params.email }, (err, data) => {
            if (err) throw err;
            client.close();
            res.json(data)
        })
    })
})

app.put('/passenger/editProfile/:email', (req, res) => {
    console.log(req.params.email);
    const passenger = {
        name: req.body.name,
        email: req.params.email,
        phone: req.body.phone
    }
            mongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
                let db = client.db('bluebus');
                db.collection('bluePassenger').updateOne({ "email": req.params.email }, {
                    $set: {
                        'name': passenger.name,
                        'email': passenger.email,
                        'phone': passenger.phone
                    }
                }, (err, data) => {
                    if (err) throw err;
                    client.close()
                    res.json({
                        message: 'Success'
                    })
                })
            })
        })

app.get('/passenger/getbusdetails/:source/:destination/:date', (req, res) => {
    console.log(req.params.source);
    console.log(req.params.destination);
    console.log(req.params.date);
    mongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
        if (err) throw err;
        var db = client.db('bluebus');
        db.collection('bus').find({ 'source': req.params.source, 'destination': req.params.destination, 'date': req.params.date, 'status': 'approved' }).toArray((err, data) => {
            if (err) throw err;
            if (data) {
                client.close();
                res.json(data)
            }
            else {
                client.close();
                res.json({
                    message: 'no buses found'
                })
            }
        })
    })

})

app.get('/passenger/viewtickets/:email', (req, res) => {
    mongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
        if (err) throw err;
        var db = client.db('bluebus');
        db.collection('bluePassenger').findOne({ 'email': req.params.email }, (err, data) => {
            if (err) throw err;
            client.close();
            res.json({
                tickets: data.ticketsBooked
            })
        })
    })
})

//book available seats

app.put('/bus/bookseats/:regNo', (req, res) => {
    //console.log(req.body);
    mongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
        if (err) throw err;
        var db = client.db('bluebus');
        db.collection('bus').findOne({ 'regNo': req.params.regNo }, (err, data) => {
            if (err) throw err;
            console.log(data);
            const busBookDetails = {
                availableTickets: data.availableTickets - req.body.bookedTickets

            }
            db.collection('bus').updateOne({ 'regNo': req.params.regNo }, {
                $set: {
                    'availableTickets': busBookDetails.availableTickets,
                    'tickets': req.body.seatList
                }
            }, (err, data) => {
                if (err) throw err;
                client.close();
                res.json({
                    message: 'bus tickets booked'
                })
            })
        })
    })
})

app.put('/passenger/bookseats/:email', (req, res) => {
    // console.log(req.body);
    mongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
        if (err) throw err;
        var db = client.db('bluebus');
        db.collection('bluePassenger').findOne({ 'email': req.params.email }, (err, data) => {
            if (err) throw err;
            //console.log(data);
            const passengerTicketDetails = req.body;
            db.collection('bluePassenger').updateOne({ 'email': req.params.email }, { $push: { 'ticketsBooked': passengerTicketDetails } }, (err, data) => {
                if (err) throw err;
                client.close();
                res.json({
                    message: 'bus tickets booked'
                })
            })
        })
    })
})

app.get('/passenger/getbusdetails/:regNo', (req, res) => {
    mongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
        let db = client.db('bluebus');
        db.collection('bus').findOne({ 'regNo': req.params.regNo }, (err, data) => {
            if (err) throw err;
            if (data) {
                client.close();
                res.json(data);
            }
            else {
                client.close();
                res.json({
                    message: 'Bus not Found'
                })
            }
        })
    })
})

//cancel Ticket

app.put('/bus/cancelseats/:regNo', (req, res) => {
    console.log(req.body);
    mongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
        if (err) throw err;
        var db = client.db('bluebus');
        db.collection('bus').findOne({ 'regNo': req.params.regNo }, (err, data) => {
            if (err) throw err;
            console.log(data);
            let tickets = data.tickets;
            console.log(tickets);
            for (let i = 0; i < tickets.length; i++) {
                if (req.body.includes(tickets[i].seatNo)) {
                    tickets[i].status = 'available'
                    console.log(tickets[i])
                    console.log('hi')
                }
            }
            let availableTickets = data.availableTickets + req.body.length


            db.collection('bus').updateOne({ 'regNo': req.params.regNo }, {
                $set: {
                    'availableTickets': availableTickets,
                    'tickets': tickets
                }
            }, (err, data) => {
                if (err) throw err;
                client.close();
                res.json({
                    message: 'bus tickets cancelled'
                })
            })
        })
    })
})

app.put('/passenger/cancelseats/:email/:id', (req, res) => {
    console.log(req.params.id);
    mongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
        if (err) throw err;
        var db = client.db('bluebus');
        db.collection('bluePassenger').findOne({ 'email': req.params.email }, (err, data) => {
            if (err) throw err;
            console.log(data);
            let tickets = data.ticketsBooked;
            for (let i = 0; i < tickets.length; i++) {
                if (tickets[i].ticketId == req.params.id) {
                    tickets[i].status = 'cancelled'
                    console.log(tickets[i])
                }
                console.log(tickets[i]);
            }
            db.collection('bluePassenger').updateOne({ 'email': req.params.email }, { $set: { 'ticketsBooked': tickets } }, (err, data) => {
                if (err) throw err;
                client.close();
                res.json({
                    message: 'bus tickets cancelled'
                })
            })
        })
    })
})


//operator

function authenticateOPerator(req, res, next) {
    var token = req.header("Authorization");
    console.log(token);
    if (token == undefined) {
        res.status(401).json({
            message: 'unauthorized'
        });

    }
    else {
        var decode = jwt.verify(token, 'qwertyuiopvxgxhmx');
        console.log(decode);
        if (decode !== undefined) {
            next();
        }
        else {
            res.status(401).json({
                message: 'unauthorized'
            });
        }
    }
}

app.get("/operator/getbusname/:email", (req, res) => {
    mongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
        let db = client.db('bluebus');
        db.collection('blueOperator').findOne({ email: req.params.email }, (err, data) => {
            if (err) throw err;
            client.close();
            console.log(data);
            res.json({
                name: data.name
            })
        })
    })
})

app.post("/operator/signup/", (req, res) => {
    console.log(req.body);
    const operator = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        phone: req.body.phone,
        status: 'pending',
        ticketsBooked: [],
        buses: []
    }
    bcrypt.genSalt(saltRound, (err, salt) => {
        console.log(salt);
        bcrypt.hash(req.body.password, salt, (err, hash) => {
            console.log(hash);
            operator.password = hash;
            mongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
                let db = client.db('bluebus');
                db.collection('blueOperator').findOne({ "email": req.body.email }, (err, data) => {
                    if (err) throw err;
                    if (!data) {
                        db.collection('blueOperator').insertOne(operator, (err, data) => {
                            if (err) throw err;
                            client.close();

                            res.json(data)
                        })
                    }
                    else {
                        client.close();
                        res.json({
                            message: 'bus operator already exists'
                        })
                    }
                })
            })
        })
    })
})



app.post('/operator/login/', (req, res) => {
    mongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
        if (err) throw err;
        const userData = {
            email: req.body.email,
            password: req.body.password
        };

        var db = client.db('bluebus');

        db.collection('blueOperator').findOne({ email: userData.email }, (err, data) => {
            if (err) throw err;
            bcrypt.compare(userData.password, data.password, (err, value) => {
                if (err) throw err;
                if (value) {
                    let jwtToken = jwt.sign({ email: userData.email }, "qwertyuiopvxgxhmx");
                    client.close();
                    res.json({
                        message: "Logged In",
                        token: jwtToken,
                        name: userData.name
                    })
                }
                else {
                    client.close();
                    res.json({
                        message: 'login failed'
                    })
                }
            })
        })
    })
})




app.post('/operator/addbus', (req, res) => {
    const busDetails = {
        name: req.body.name,
        source: req.body.source,
        destination: req.body.destination,
        date: req.body.date,
        time: req.body.time,
        totalTickets: req.body.totalTickets,
        availableTickets: req.body.totalTickets,
        price: req.body.price,
        busType: req.body.busType,
        status: 'pending',
        regNo: req.body.regNo,
        driverNo: req.body.driverNo,
        driverName: req.body.driverName,
        tickets: []
    }
    for (let i = 0; i < busDetails.totalTickets; i++) {
        let temp;
        temp = {
            seatNo: i + 1,
            status: 'available'
        }
        busDetails.tickets.push(temp);
    }
    console.log(busDetails);
    mongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
        let db = client.db('bluebus');
        db.collection('bus').findOne({ "regNo": req.body.regNo }, (err, data) => {
            if (err) throw err;
            if (!data) {
                db.collection('bus').insertOne(busDetails, (err, data) => {
                    if (err) throw err;
                    client.close();

                    res.json(data)
                })
            }
            else {
                client.close();
                res.json({
                    message: 'bus already exists'
                })
            }
        })
    })
})

app.get('/operator/viewbuses/:name', (req, res) => {
    console.log(req.params.name)
    mongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
        if (err) throw err;
        var db = client.db('bluebus');
        db.collection('bus').find({ 'name': req.params.name }).toArray((err, data) => {
            if (err) throw err;
            client.close();
            if (data) {
                res.json(data);
                console.log(data);
            }
            else {
                res.json({
                    message: 'No Bus Found'
                })
            }
        })
    })
})

app.delete('/operator/deletebus/:regno', (req, res) => {
    console.log(req.params.regNo);
    mongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
        let db = client.db('bluebus');
        db.collection('bus').deleteOne({ 'regNo': req.params.regNo }, (err, data) => {
            if (err) throw err;
            client.close();
            res.json({
                message: 'bus deleted'
            })
        })
    })
})



//admin

function authenticateAdmin(req, res, next) {
    var token = req.header("Authorization");
    console.log(token);
    if (token == undefined) {
        res.status(401).json({
            message: 'unauthorized'
        });

    }
    else {
        var decode = jwt.verify(token, 'kjbfkjdsbgfksdbg');
        console.log(decode);
        if (decode !== undefined) {
            next();
        }
        else {
            res.status(401).json({
                message: 'unauthorized'
            });
        }
    }
}

app.post('/admin/login', (req, res) => {
    mongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
        if (err) throw err;
        const userData = {
            email: req.body.email,
            password: req.body.password
        };

        var db = client.db('bluebus');

        db.collection('blueAdmin').findOne({ 'email': userData.email }, (err, data) => {
            if (err) throw err;
            if (userData.password == data.password) {
                client.close();
                res.json({
                    message: "Logged In",
                })
            }
            else {
                client.close();
                res.json({
                    message: 'login failed'
                })
            }
        })
    })
})

app.get('/admin/approvalbus', (req, res) => {
    mongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
        if (err) throw err;
        var db = client.db('bluebus');
        db.collection('bus').find({ 'status': 'pending' }).toArray((err, data) => {
            if (err) throw err;
            if (data) {
                client.close();
                res.json(data);
            }
            else {
                client.close();
                res.json({
                    message: 'no pending approval'
                })
            }
        })
    })
})

app.put('/admin/approvalbus/:regNo/:action', (req, res) => {
    console.log(req.params.regNo, req.params.action);
    mongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
        if (err) throw err;
        var db = client.db('bluebus');
        db.collection('bus').updateOne({ 'regNo': req.params.regNo }, { $set: { 'status': req.params.action } }, (err, data) => {
            if (err) throw err;
            client.close();
            res.json({
                message: 'status updated'
            })
        })
    })
})

app.get('/admin/approvaloperator', (req, res) => {
    mongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
        if (err) throw err;
        var db = client.db('bluebus');
        db.collection('blueOperator').find({ 'status': 'pending' }).toArray((err, data) => {
            if (err) throw err;
            if (data) {
                client.close();
                res.json(data);
            }
            else {
                client.close();
                res.json({
                    message: 'no pending approval'
                })
            }
        })
    })
})


app.put('/admin/approvaloperator/:email/:action', (req, res) => {
    mongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
        if (err) throw err;
        var db = client.db('bluebus');
        db.collection('blueOperator').updateOne({ 'email': req.params.email }, { $set: { 'status': req.params.action } }, (err, data) => {
            if (err) throw err;
            client.close();
            res.json({
                message: 'status updated'
            })
        })
    })
})

app.delete('/admin/deleteoperator/:email/:name', (req, res) => {
    mongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
        if (err) throw err;
        var db = client.db('bluebus');
        db.collection('blueOperator').deleteOne({ 'email': req.params.email }, (err, data) => {
            if (err) throw err;
            db.collection('bus').deleteMany({ 'name': req.params.name }, (err, value) => {
                if (err) throw err;
                if (value) {
                    client.close();
                    res.json({
                        message: 'operator and buses deleted'
                    })
                }
                else {
                    client.close();
                    res.json({
                        message: 'operator deleted'
                    })
                }

            })

        })
    })
})


app.delete('/admin/deletebus/:regno', (req, res) => {
    mongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
        if (err) throw err;
        var db = client.db('bluebus');
        db.collection('bus').deleteOne({ 'regNo': req.params.regno }, (err, data) => {
            if (err) throw err;
            client.close();
            res.json({
                message: 'bus deleted'
            })
        })
    })
})

const backendPort = process.env.PORT;
app.listen(backendPort, () => {
    console.log("port in 3000");
})