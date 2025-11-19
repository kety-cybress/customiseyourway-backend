const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

app.use(bodyParser.json());

// endpoint to get signup
app.post('/signup', (req, res) => {
  res.status(501).json({message: "Not implemented"});
});

// endpoint to Get verify credentials
app.get('/verifycredentials', (req, res) => {
  res.status(501).json({message: "Not implemented"});
});

app.get('/customizationoptions', (req, res) => {
  res.status(501).json({message: "Not implemented"});
});

app.post('/designdata', (req, res) => {
  res.status(501).json({message: "Not implemented"});
});

app.post('/addtocart', (req, res) => {
  res.status(501).json({message: "Not implemented"});
});

app.post('/processpayment', (req, res) => {
  res.status(501).json({message: "Not implemented"});
});

app.put('/updateprofile', (req, res) => {
  res.status(501).json({message: "Not implemented"});
});

app.post('/location', (req, res) => {
  res.status(501).json({message: "Not implemented"});
});

app.post('/verifybankdetails', (req, res) => {
  res.status(501).json({message: "Not implemented"});
});

app.post('/cart', (req, res) => {
  res.status(501).json({message: "Not implemented"});
});

app.post('/trackorderstatus', (req, res) => {
  res.status(501).json({message: "Not implemented"});
});

app.post('/confirmorder', (req, res) => {
  res.status(501).json({message: "Not implemented"});
});

app.delete('/userprofile', (req, res) => {
  res.status(501).json({message: "Not implemented"});
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
