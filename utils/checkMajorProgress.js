import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { checkDepth } from "../scripts/utils/checkDepth.js";
import { checkBreadth } from "../scripts/utils/checkBreadth.js"; // NEW

// Local __dirname for this utils file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const courseData = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../backend/course-data/courses.json"),
    "utf-8"
  )
);
const courseCodeData = courseData.map((c) => c.code);

// check if all user courses exist in course data
function checkExists(userCourses) {
  const allCodes = courseCodeData.map((c) => c.toUpperCase());
  return userCourses.every((code) => allCodes.includes(code.toUpperCase()));
}

// match course code to subject prefix
function subjectMatch(code, sub) {
  const u = code.toUpperCase();
  const s = sub.toUpperCase();
  return u.startsWith(s) && /\d/.test(u.charAt(s.length));
}

// validate course ranges and return valid courses
function checkRange(requirement, excludedCourses) {
  let valid_courses = [];

  // Handle explicit numeric ranges
  if (Array.isArray(requirement.range)) {
    requirement.range.forEach((r) => {
      const [start, end] = r.split("-");
      if (!end) {
        const match = courseData.find(
          (c) => c.code.toUpperCase() === start.toUpperCase()
        );
        if (match) valid_courses.push(match);
        return;
      }
      const prefix = start.match(/^[A-Za-z]+/)[0];
      const startNum = parseInt(start.match(/\d+/)[0], 10);
      const endNum = parseInt(end.match(/\d+/)[0], 10);

      const matches = courseData.filter((c) => {
        if (!c.code.startsWith(prefix)) return false;
        const num = parseInt(c.code.match(/\d+/)[0], 10);
        return num >= startNum && num <= endNum;
      });
      valid_courses.push(...matches);
    });
  }

  // Handle level ranges like "AFM3", "AFM4", "CS6" etc.
  // Expect format like "AFM3" meaning AFM 300-399, "AFM4" => AFM 400-499
  if (Array.isArray(requirement.level_ranges)) {
    requirement.level_ranges.forEach((prefix) => {
      // Split into subject letters and level digit(s)
      const subjectMatch = prefix.match(/^([A-Za-z]+)(\d+)$/);
      if (!subjectMatch) return;
      const subject = subjectMatch[1].toUpperCase(); // e.g., AFM
      const levelDigit = parseInt(subjectMatch[2], 10); // e.g., 3

      // numeric range: levelDigit*100 .. (levelDigit+1)*100 - 1
      const startNum = levelDigit * 100;
      const endNum = (levelDigit + 1) * 100 - 1;

      const matches = courseData.filter((c) => {
        const code = c.code.toUpperCase();
        // exact subject prefix
        if (!code.startsWith(subject)) return false;
        // extract numeric part and compare range
        const numMatch = code.match(/\d+/);
        if (!numMatch) return false;
        const num = parseInt(numMatch[0], 10);
        return num >= startNum && num <= endNum;
      });

      valid_courses.push(...matches);
    });
  }

  // Handle pattern matches like "AFM3" (subject + level)
  if (Array.isArray(requirement.patterns)) {
    requirement.patterns.forEach((pattern) => {
      const match = pattern.match(/^([A-Za-z]+)(\d)$/);
      if (!match) return;
      const subject = match[1].toUpperCase();
      const level = parseInt(match[2]);
      const start = level * 100;
      const end = (level + 1) * 100 - 1;
      const matches = courseData.filter((c) => {
        if (!c.code.startsWith(subject)) return false;
        const numMatch = c.code.match(/\d+/);
        if (!numMatch) return false;
        const num = parseInt(numMatch[0]);
        return num >= start && num <= end;
      });
      valid_courses.push(...matches);
    });
  }

  // Category subject prefixes like "ACTSC" OR "CO"
  if (Array.isArray(requirement.category_ranges)) {
    requirement.category_ranges.forEach((item) => {
      const matches = courseData.filter((c) => subjectMatch(c.code, item));
      valid_courses.push(...matches);
    });
  }

  // Explicit listed courses (like CO487, CS251/E)
  if (Array.isArray(requirement.courses)) {
    requirement.courses.forEach((c) => {
      if (!excludedCourses.includes(c.code.toUpperCase())) {
        valid_courses.push(c);
      }
    });
  }

  // Deduplicate AND filter out excluded codes
  const seen = new Set();
  valid_courses = valid_courses.filter((c) => {
    const code = c.code.toUpperCase();
    if (seen.has(code) || excludedCourses.includes(code)) return false;
    seen.add(code);
    return true;
  });

  return valid_courses;
}

// check communication requirement
function checkCommunicationReq(requirement, userCourses) {
  const listResults = {};
  Object.entries(requirement).forEach((list) => {
    const listKey = list[0];
    const listValue = list[1];
    if (listKey !== "options") {
      const taken = listValue.courses.filter((c) =>
        userCourses.includes(c.code.toUpperCase())
      );
      const remaining = listValue.courses.filter(
        (c) => !userCourses.includes(c.code.toUpperCase())
      );
      listResults[listKey] = {
        description: listValue.description,
        courses_taken: taken,
        courses_remaining: remaining,
      };
    }
  });
  const optionResults = Array.isArray(requirement.options)
    ? requirement.options.map((option) => {
        const met = option.requires.every(
          (req) => listResults[req.list].courses_taken.length >= req.count
        );
        return { description: option.description, met };
      })
    : [];
  return { lists: listResults, options: optionResults };
}

// generate descriptions for requirements
function createDescription(requirement) {
  if (requirement.description) {
    return requirement.description;
  }
  if (requirement.type === "one_group_required") {
    // Use the parent description if it exists
    let desc =
      requirement.description || "Complete one of the following options";

    // Append each group's description or generated description
    if (Array.isArray(requirement.groups)) {
      const groupDescs = requirement.groups
        .map((group) => group.description || createDescription(group) || "")
        .filter(Boolean);
      if (groupDescs.length) {
        desc = groupDescs.join(" or ");
      }
    }
    return desc;
  }

  const courseCodes = Array.isArray(requirement.courses)
    ? requirement.courses.map((c) => c.code).join(", ")
    : "";
  if (requirement.type === "all_required") {
    return "Complete all of " + courseCodes;
  } else if (requirement.type === "one_required") {
    return "Complete one of " + courseCodes;
  } else if (requirement.type === "n_required") {
    const reqText = requirement.required
      ? ` and ${requirement.required.join(
          ", "
        )} if not taken to fulfil a requirement previously`
      : "";
    return `Complete ${requirement.count} of ` + courseCodes + reqText;
  }
}

// check requirement satisfaction
function checkReq(value, userCourses, all_courses_taken, excludedCourses) {
  return value.map((requirement) => {
    const type = requirement.type;
    let description = "";
    if (type === "range_required") {
      const rangeText = Array.isArray(requirement.range)
        ? requirement.range.join(", ")
        : "";
      const levelText =
        Array.isArray(requirement.level_ranges) &&
        requirement.level_ranges.length
          ? `, or any course starting with ${requirement.level_ranges.join(
              " or "
            )}`
          : "";
      description =
        requirement.description ||
        `Complete ${requirement.count} from ${rangeText}${levelText}`;
    } else {
      description = createDescription(requirement);
    }

    let valid_courses = [];
    if (type === "range_required") {
      valid_courses = checkRange(requirement, excludedCourses);
    } else if (type === "n_required") {
      // Start with explicitly listed courses (if any)
      valid_courses = [];

      if (Array.isArray(requirement.courses)) {
        requirement.courses.forEach((c) => {
          if (!excludedCourses.includes(c.code.toUpperCase())) {
            valid_courses.push(c);
          }
        });
      }

      // Then add pattern/range matches (e.g., AFM3xx)
      const patternMatches = checkRange(requirement, excludedCourses);
      patternMatches.forEach((course) => {
        if (!valid_courses.some((c) => c.code === course.code)) {
          valid_courses.push(course);
        }
      });

      // Finally, ensure "required" field courses (if any) are also included
      if (Array.isArray(requirement.required)) {
        requirement.required.forEach((reqCode) => {
          const match = courseData.find(
            (c) => c.code.toUpperCase() === reqCode.toUpperCase()
          );
          if (match && !excludedCourses.includes(match.code.toUpperCase())) {
            if (!valid_courses.some((c) => c.code === match.code)) {
              valid_courses.push(match);
            }
          }
        });
      }
    } else if (Array.isArray(requirement.courses)) {
      valid_courses = requirement.courses.filter(
        (c) => !excludedCourses.includes(c.code.toUpperCase())
      );
    } else {
      valid_courses = [];
    }

    const taken = valid_courses.filter(
      (c) =>
        userCourses.includes(c.code.toUpperCase()) &&
        !all_courses_taken.includes(c.code.toUpperCase())
    );
    const remaining = valid_courses.filter(
      (c) => !userCourses.includes(c.code.toUpperCase())
    );

    // Push just the code string into all_courses_taken
    // taken.forEach((item) => all_courses_taken.push(item.code.toUpperCase()));
    const used = taken.slice(0, requirement.count ?? taken.length);
    used.forEach((item) => all_courses_taken.push(item.code.toUpperCase()));

    let met = false;
    switch (type) {
      case "all_required":
        met = remaining.length === 0;
        break;
      case "one_required":
        met = taken.length > 0;
        break;
      case "range_required":
        met = taken.length >= requirement.count;
        break;
      case "n_required":
        if (Array.isArray(requirement.required)) {
          const requiredTaken = requirement.required.every((reqCode) =>
            taken.some((c) => c.code.toUpperCase() === reqCode.toUpperCase())
          );
          met = requiredTaken && taken.length >= requirement.count;
        } else {
          met = taken.length >= requirement.count;
        }
        break;
      case "one_group_required": {
        // Evaluate each group
        const groupResults = requirement.groups.map((group) =>
          checkReq([group], userCourses, all_courses_taken, excludedCourses)
        );

        // Flatten the results
        const flatResults = groupResults.flat();

        // Merge taken/remaining from all groups
        const allTaken = flatResults.flatMap((r) => r.courses_taken);
        const allRemaining = flatResults.flatMap((r) => r.courses_remaining);

        // Deduplicate by course code
        const seenTaken = new Set();
        const seenRemaining = new Set();
        const uniqueTaken = allTaken.filter((c) => {
          if (seenTaken.has(c.code)) return false;
          seenTaken.add(c.code);
          return true;
        });
        const uniqueRemaining = allRemaining.filter((c) => {
          if (seenRemaining.has(c.code)) return false;
          seenRemaining.add(c.code);
          return true;
        });

        // Met if ANY subgroup is *fully satisfied* (i.e., its own met flag is true
        // AND it has no outstanding required courses remaining)
        met = groupResults.some((groupArr) =>
          groupArr.some((r) => {
            // require the subgroup to have met === true and, for safety,
            // if courses_remaining is present, ensure it's empty
            if (!r.met) return false;
            if (Array.isArray(r.courses_remaining)) {
              return r.courses_remaining.length === 0;
            }
            return true;
          })
        );

        return {
          description,
          type,
          courses_taken: uniqueTaken,
          courses_remaining: uniqueRemaining,
          met,
        };
      }
    }
    if (type === "range_required") {
      return {
        description: requirement.description,
        type,
        courses_taken: taken,
        courses_remaining: remaining,
        met,
      };
    }
    return {
      description,
      type,
      courses_taken: taken,
      courses_remaining: remaining,
      met,
    };
  });
}

// breadth requirement check (delegates to checkBreadth.js)
function checkBreadthReq(sourcePath, userCourses, { debug = false } = {}) {
  // Just call checkBreadth directly
  const result = checkBreadth(userCourses, { debug });

  return {
    satisfied: result.ok,
    description: result.description,
    categories: result.categories,
    note: "Overlap is only allowed between Pure and Applied Sciences. Comm List I exclusions are not counted.",
  };
}

// depth requirement check (patched with debug + exclusion note)
function checkDepthReq(sourcePath, userCourses, { debug = false } = {}) {
  const sourceData = JSON.parse(fs.readFileSync(sourcePath, "utf-8"));
  const result = checkDepth(userCourses, { debug });

  if (!result.ok) {
    return {
      description: sourceData.options.map((o) => o.description).join(" OR "),
      satisfied: false,
      note: "Depth not satisfied. Either insufficient courses/chain length, or all selected courses are in excluded subjects (e.g., CS, MATH, STAT, etc.).",
      examples: sourceData.examples,
    };
  }

  return {
    description: sourceData.options.map((o) => o.description).join(" OR "),
    satisfied: true,
    option_met: result.option || null,
    subject: result.subject || null,
    chain: result.chain || null,
    courses_used: result.courses || null,
    examples: sourceData.examples,
  };
}

// main driver for major progress check
function checkMajorProgress(major, userCourses, { debug = false } = {}) {
  const majorPath = path.join(
    __dirname,
    "../backend/requirements",
    `${major}.json`
  );
  const majorData = JSON.parse(fs.readFileSync(majorPath, "utf-8")); // Stored major requirements data

  const excludedCourses = (majorData.excluded_courses || []).map((c) =>
    c.code.toUpperCase()
  );

  const result = {
    program: major,
  };
  let all_courses_taken = [];

  // majorProgress calculation
  Object.entries(majorData).forEach(([key, value]) => {
    if (
      key === "required_courses" ||
      key === "elective_requirement" ||
      key === "additional_requirement"
    ) {
      result[key] = checkReq(
        value,
        userCourses,
        all_courses_taken,
        excludedCourses
      );
    } else if (key === "communication_requirement") {
      result[key] = checkCommunicationReq(value, userCourses);
    } else if (key === "breadth_requirement") {
      const breadthPath = path.join(
        __dirname,
        "../backend/requirements",
        value.source
      ); // Stored breadth requirements data
      result[key] = checkBreadthReq(breadthPath, userCourses, { debug });
    } else if (key === "depth_requirement") {
      const depthPath = path.join(
        __dirname,
        "../backend/requirements",
        value.source
      ); // Stored depth requirements data
      result[key] = checkDepthReq(depthPath, userCourses, { debug });
    }
  });

  return result;
}

export {
  checkExists,
  checkRange,
  createDescription,
  checkReq,
  checkBreadthReq,
  checkDepthReq,
  checkMajorProgress,
};
