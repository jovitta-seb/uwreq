import fetch from "node-fetch";

const UWFLOW_GRAPHQL = "https://uwflow.com/graphql";

function normalizeCode(code) {
  return code.toLowerCase().replace(/\s+/g, "");
}

export async function getCourseData(rawCode) {
  const code = normalizeCode(rawCode);

  const query = `
    query {
      course(where:{code:{_eq:"${code}"}}) {
        code
        name
        rating {
          liked
          easy
          useful
          filled_count
        }
      }
    }
  `;

  const res = await fetch(UWFLOW_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });

  const json = await res.json();
  return json?.data?.course?.[0] ?? null;
}
