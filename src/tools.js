const csv = require("csv-parser");
const fs = require("fs");

const bookings = JSON.parse(fs.readFileSync("./bookings.json")).map(
  bookingRecord => ({
    time: Date.parse(bookingRecord.time),
    duration: bookingRecord.duration * 60 * 1000, // mins into ms
    user_id: bookingRecord.user_id
  })
);

function getAllBookings() {
  return JSON.parse(fs.readFileSync("./bookings.json"));
}

function getBookings(criteria) {
  let filteredBookings = bookings.map(b => {
    return Object.assign({}, b);
  });

  if (criteria && Object.keys(criteria).length > 0) {
    filteredBookings = bookings.filter(booking => {
      let includeValue = true;
      const resultArray = [];

      if ("=" in criteria) {
        for (let ec of criteria["="])
          resultArray.push(booking[ec.column] === ec.value ? 1 : 0);
      }
      if ("not=" in criteria) {
        for (let ec of criteria["not="])
          resultArray.push(booking[ec.column] !== ec.value ? 1 : 0);
      }

      for (let i of resultArray) {
        if (i === 0) {
          includeValue = false;
          break;
        }
      }

      return includeValue;
    });
  }

  return filteredBookings;
}

function addBooking(booking, checkOverlap = true) {
  console.log(booking);
  console.log(checkOverlap);

  let overlapedBookings = [];
  const bookings = JSON.parse(fs.readFileSync("./bookings.json"));

  if (checkOverlap) {
    const tempBookings = [];
    console.log("inside check overlap");

    for (booking of bookings) {
      const tempBooking = Object.assign({}, booking);
      tempBooking.start = Date.parse(booking.time);
      tempBooking.end =
        (tempBooking.start * 1 + tempBooking.duration * 60 * 1000 * 1) * 1;

      tempBookings.push(tempBooking);
    }

    const newBookingStart = Date.parse(booking.time);
    const newBookingEnd =
      (newBookingStart * 1 + booking.duration * 60 * 1000) * 1;

    overlapedBookings = tempBookings.filter(
      b =>
        (newBookingStart >= b.start && newBookingStart < b.end) ||
        (newBookingEnd > b.start && newBookingEnd <= b.end) ||
        (newBookingStart <= b.start && newBookingEnd >= b.end)
    );
  }

  return new Promise((resolve, reject) => {
    if (overlapedBookings.length > 0) {
      //console.log("should not be here");
      resolve({ booking: booking, existing: overlapedBookings });
    } else {
      bookings.push(booking);
      fs.writeFile(
        "./bookings.json",
        JSON.stringify(bookings),
        "utf8",
        function() {
          resolve(true);
        }
      );
    }
  });
}

function parseCSV(file) {
  const finalOutput = { clean: [], overlaped: [] };
  return new Promise((resolve, reject) => {
    const fBookings = getBookings({});
    console.log(fBookings);

    fs.createReadStream(file.destination + "/" + file.filename)
      .pipe(csv({ mapValues: ({ header, index, value }) => value.trim() }))
      .on("data", data => {
        const row = Object.assign({}, data);
        row.duration = parseInt(row.duration);
        row.user_id = row.userId;
        delete row.userId;

        const fileStartPoint = Date.parse(row.time);
        const fileEndPoint =
          (fileStartPoint * 1 + row.duration * 60 * 1000 * 1) * 1;

        //const fBookings = getBookings({
        //  "not=": [{ column: "userId", value: row.userId }]
        //});
        // console.log("flie etry", row);
        // console.log("fe sp", fileStartPoint);
        // console.log("fp ep", fileEndPoint);

        let overlapFound = false;

        for (let fb of fBookings) {
          const systemStart = fb.time;
          const systemEnd = (systemStart * 1 + fb.duration * 1) * 1;

          // console.log("system entry", fb);
          // console.log("ss", systemStart);
          // console.log("ss e", systemEnd);

          if (
            (systemStart < fileStartPoint && systemEnd <= fileStartPoint) ||
            systemStart >= fileEndPoint
          ) {
            continue;
          } else {
            //console.log("file entr", row);
            //console.log("system entry", fb);
            // finalOutput.overlaped.push({ file_entry: row, db_entry: fb });
            finalOutput.overlaped.push({ file_entry: row, db_entry: fb });
            overlapFound = true;
            break;
          }
        }

        if (overlapFound === false) {
          finalOutput.clean.push(row);
          //addBooking(row, false);
        }

        //console.log(row);
      })
      .on("end", () => {
        //console.log("CSV file successfully processed");
        //console.log(finalOutput);
        if (finalOutput.clean.length > 0) {
          const existingBookings = JSON.parse(
            fs.readFileSync("./bookings.json")
          );

          for (let cleanBooking of finalOutput.clean)
            existingBookings.push(cleanBooking);

          console.log(existingBookings);
          fs.writeFile(
            "./bookings.json",
            JSON.stringify(existingBookings),
            "utf8",
            function() {
              resolve(finalOutput);
            }
          );
        } else resolve(finalOutput);

        // let writeStream = fs.createWriteStream("./bookings.json");

        // write some data with a base64 encoding
        // writeStream.write(JSON.stringify(bookings));

        // // the finish event is emitted when all data has been flushed from the stream
        // writeStream.on("finish", () => {
        //   console.log("wrote all data to file");
        //   writeStream.end();
        //   resolve(finalOutput);
        // });
      });

    console.log(file);
  });
}

module.exports = {
  parseCSV,
  bookings,
  getBookings,
  addBooking,
  getAllBookings
};
