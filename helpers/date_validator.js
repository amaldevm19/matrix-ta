function jobDateValidator(d) {
    const regex = /^(?!0000)[0-9]{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])\s(?:[01][0-9]|2[0-3]):(?:[0-5][0-9]):(?:[0-5][0-9])\.(?:[0-9]{3})$/;
    const givenDateString = d; // Date string to compare
    const currentDate = new Date(); // Current date object
    const givenDate = new Date(Date.parse(givenDateString)); // Parsed date object
    if (regex.test(d) && (givenDate.getTime() >= currentDate.getTime())) {
        return true;
    } else {
        return false;
    }
}

module.exports = jobDateValidator;