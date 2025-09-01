# OnTrack
Course requirement tracker to make sure you're on track to graduate :)

## Project Structure
```
uwreq/
├── backend/
│   ├── course-data/
│   │   ├── course_offerings.csv
│   │   ├── courses.json
│   │   └── csv_to_json.js
│   └── requirements/
│       ├── BCS computer science.json
│       ├── breadth.json
│       └── depth.json
├── public/
│   └── styles/
│       └── main.css
├── utils/
│   └── checkMajorProgress.js
├── views/
│   ├── layout.ejs
│   ├── homepage.ejs
│   ├── about.ejs
│   ├── contact.ejs
│   ├── features.ejs
│   └── result.ejs
├── .gitignore
├── index.js
├── package.json
├── package-lock.json
└── README.md

```

# Quickstart
git clone https://github.com/jovitta-seb/uwreq
cd uwreq
npm install
nodemon index.js

# Data Handling
This project uses open, public course data from the University of Waterloo's undergraduate calender
(https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog#/courses)

If the calender is updated, make necessary changes to the csv and regenerate json by running csv-to-json.js

# Degree Requirements System
Each program is represented as an object containing:

{
    program: "...",
    required_courses: [],
    elective_requirement: [],
    communication_requirement: {},
    breadth_requirement: {},
    depth_requirement: {}
}

## Requirement Types

- **all_required**: All listed courses must be completed
- **one_required**: Any one of the listed courses must be completed
- **range_required**: Complete the specified number of courses from a course range (e.g., CS340-CS398) and/or level range (e.g., CS6, CS7)
- **one_group_required**: Atleast one of the nested groups must be satisfied


## Notation Guide

- **Course ranges**: CS340-CS398 means any CS course numbered 340 through 398
- **Level ranges**: CS6/CS7 means any CS course at the 600-level/700-level