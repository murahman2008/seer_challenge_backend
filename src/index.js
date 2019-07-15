const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
//const csvParser = require("csv-parser");
const tools = require("./tools");

const app = express();
app.use(express.json());
app.use(cors()); // so that app can access

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, ".");
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

app.get("/bookings", (_, res) => {
  res.json(
    //tools.getBookings({ "not=": [{ column: "userId", value: "0002" }] })
    tools.getAllBookings()
  );
});

app.post("/booking", (req, res) => {
  const { booking, checkOverlap } = req.body;
  tools.addBooking(booking, checkOverlap).then(result => {
    //console.log(result);
    //res.json({ status: true });
    if (result === true) res.json({ status: true, bookings: tools.bookings });
    else res.json(JSON.stringify(result));
  });
});

const upload = multer({ storage: storage }).single("file");
app.post("/upload", function(req, res) {
  upload(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      return res.status(500).json(err);
    } else if (err) {
      return res.status(500).json(err);
    }

    tools.parseCSV(req.file).then(result => res.json(JSON.stringify(result)));
  });
});

app.get("/", (req, res) => {
  res.write("hello world");
});

app.listen(8080);
