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
├── views/
│   ├── layout.ejs
│   ├── homepage.ejs
│   ├── about.ejs
│   ├── contact.ejs
│   └── features.ejs
├── .gitignore
├── index.js
├── package.json
├── package-lock.json
└── README.md

```

# Quickstart
git clone https://github.com/jovitta-seb/uwreq
cd ontrack/uwreq
npm install
node index.js

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
    communication_requirement: [],
    breadth_requirement: {},
    depth_requirement: {}
}

## Requirement Types

- **all_required**: All courses in this group must be completed
- **one_required**: Choose exactly one course from the available options
- **range_required**: Choose the specified number of courses from a course range (e.g., CS340-CS398)
- **one_group_required**: Choose one of the available groups to satisfy
- **list1_required**: Choose 2 courses from List 1
- **list1+list2_required**: Choose 1 course from List 1 AND 1 course from List 2

## Notation Guide

- **Course ranges**: CS340-CS398 means any CS course numbered 340 through 398
- **Level ranges**: CS6xx/CS7xx means any CS course at the 600-level/700-level