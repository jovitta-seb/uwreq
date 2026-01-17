# OnTrack
Course requirement tracker to make sure you're on track to graduate :)

<img width="1427" height="749" alt="Screenshot 2026-01-17 at 5 12 08 PM" src="https://github.com/user-attachments/assets/06e40d1d-6104-4820-bf40-836d518da8a9" />
<img width="1427" height="749" alt="Screenshot 2026-01-17 at 5 29 27 PM (1)" src="https://github.com/user-attachments/assets/850950f5-2337-4e9a-b9db-9482c67073b1" />

## Project Structure
```
uwreq/
├── backend/
│   ├── course-data/
│   │   ├── course_offerings.csv
│   │   ├── courses.json
│   │   └── csv_to_json.js
│   └── requirements/
│       ├── BCS Computer Science.json
│       ├── BCS Data Science.json
│       ├── BMath Computer Science.json
│       ├── BCFM Computing and Financial Management.json
│       ├── breadth.json
│       └── depth.json
├── public/
│   └── styles/
│       └── main.css
├── routes/
│   └──uwflow.js
├── utils/
│       ├── checkMajorProgress.js
│       └── uwflow.js
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
This project uses open, public course data from the University of Waterloo's undergraduate calendar
(https://uwaterloo.ca/academic-calendar/undergraduate-studies/catalog#/courses)

If the calendar is updated, make necessary changes to the csv and regenerate JSON by running csv-to-json.js

# UWFlow integration
Course sentiment data taken from UWFlow
https://github.com/UWFlow/uwflow/releases/tag/v1.0.0 

# Degree Requirements System
Each program is represented as an object containing:

{
    program: "...",
    // excluded_courses: [], // optional — courses that cannot be counted towards the degree
    required_courses: [],
    elective_requirement: [],
    additional_requirement: [], // optional — degree specific
    communication_requirement: {},
    breadth_requirement: {},
    depth_requirement: {}
}

## Requirement Types

- **all_required**: All listed courses must be completed
- **one_required**: Any one of the listed courses must be completed
- **n_required**: Given count of listed courses must be completed
- **range_required**: Complete the specified number of courses from a course range (e.g., CS340-CS398) and/or level range (e.g., CS6, CS7)
- **one_group_required**: Atleast one of the nested groups must be satisfied


## Notation Guide

- **Course ranges**: CS340-CS398 means any CS course numbered 340 through 398
- **Level ranges**: CS6/CS7 means any CS course at the 600-level/700-level
- **Category ranges**: Any course in a specific category (ex: ACTSC, STAT, etc)
