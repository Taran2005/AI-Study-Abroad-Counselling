import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";

const openai = new OpenAI();

const UNIVERSITY_DATA = [
  {
    name: "University of Oxford",
    country: "UK",
    city: "Oxford",
    ranking: 1,
    courses: [
      {
        name: "Computer Science",
        level: "PG",
        duration: "1 year",
        fees: "£35,000",
      },
      { name: "MBA", level: "PG", duration: "1 year", fees: "£65,000" },
      { name: "Economics", level: "UG", duration: "3 years", fees: "£30,000" },
    ],
    requirements: { ielts_min: 7.0, gpa_min: "3.5", a_level: "AAA" },
    costs: {
      tuition_min: 30000,
      tuition_max: 65000,
      living_annual: 15000,
      currency: "GBP",
    },
    scholarships: [
      {
        name: "Oxford Graduate Scholarship",
        value: "Full tuition + living",
        eligibility: "Academic excellence",
      },
    ],
    website: "https://www.ox.ac.uk",
  },
  {
    name: "University of Cambridge",
    country: "UK",
    city: "Cambridge",
    ranking: 2,
    courses: [
      { name: "Engineering", level: "PG", duration: "1 year", fees: "£35,000" },
      {
        name: "Mathematics",
        level: "UG",
        duration: "3 years",
        fees: "£30,000",
      },
      {
        name: "Natural Sciences",
        level: "UG",
        duration: "3 years",
        fees: "£28,000",
      },
    ],
    requirements: { ielts_min: 7.0, gpa_min: "3.5", a_level: "AAA" },
    costs: {
      tuition_min: 28000,
      tuition_max: 65000,
      living_annual: 14000,
      currency: "GBP",
    },
    scholarships: [
      {
        name: "Cambridge International Scholarship",
        value: "£20,000",
        eligibility: "International students",
      },
    ],
    website: "https://www.cam.ac.uk",
  },
  {
    name: "Imperial College London",
    country: "UK",
    city: "London",
    ranking: 3,
    courses: [
      {
        name: "Data Science",
        level: "PG",
        duration: "1 year",
        fees: "£38,000",
      },
      {
        name: "Artificial Intelligence",
        level: "PG",
        duration: "1 year",
        fees: "£40,000",
      },
      { name: "Medicine", level: "UG", duration: "6 years", fees: "£45,000" },
    ],
    requirements: { ielts_min: 6.5, gpa_min: "3.3", a_level: "AAA" },
    costs: {
      tuition_min: 35000,
      tuition_max: 50000,
      living_annual: 18000,
      currency: "GBP",
    },
    scholarships: [
      {
        name: "Imperial President's Scholarship",
        value: "£10,000",
        eligibility: "Academic excellence",
      },
    ],
    website: "https://www.imperial.ac.uk",
  },
  {
    name: "University College London",
    country: "UK",
    city: "London",
    ranking: 4,
    courses: [
      {
        name: "Machine Learning",
        level: "PG",
        duration: "1 year",
        fees: "£35,000",
      },
      {
        name: "Architecture",
        level: "UG",
        duration: "3 years",
        fees: "£28,000",
      },
      { name: "Law", level: "UG", duration: "3 years", fees: "£26,000" },
    ],
    requirements: { ielts_min: 6.5, gpa_min: "3.3", a_level: "AAB" },
    costs: {
      tuition_min: 26000,
      tuition_max: 40000,
      living_annual: 16000,
      currency: "GBP",
    },
    scholarships: [
      {
        name: "UCL Global Undergraduate Scholarship",
        value: "£15,000",
        eligibility: "International students",
      },
    ],
    website: "https://www.ucl.ac.uk",
  },
  {
    name: "University of Edinburgh",
    country: "UK",
    city: "Edinburgh",
    ranking: 5,
    courses: [
      {
        name: "Artificial Intelligence",
        level: "PG",
        duration: "1 year",
        fees: "£32,000",
      },
      {
        name: "Data Science",
        level: "PG",
        duration: "1 year",
        fees: "£30,000",
      },
      {
        name: "Business Analytics",
        level: "PG",
        duration: "1 year",
        fees: "£28,000",
      },
    ],
    requirements: { ielts_min: 6.5, gpa_min: "3.2", a_level: "ABB" },
    costs: {
      tuition_min: 28000,
      tuition_max: 35000,
      living_annual: 12000,
      currency: "GBP",
    },
    scholarships: [
      {
        name: "Edinburgh Global Undergraduate Scholarship",
        value: "£5,000",
        eligibility: "Academic excellence",
      },
    ],
    website: "https://www.ed.ac.uk",
  },
  {
    name: "King's College London",
    country: "UK",
    city: "London",
    ranking: 6,
    courses: [
      {
        name: "International Relations",
        level: "PG",
        duration: "1 year",
        fees: "£30,000",
      },
      { name: "Psychology", level: "UG", duration: "3 years", fees: "£24,000" },
      { name: "Medicine", level: "UG", duration: "6 years", fees: "£42,000" },
    ],
    requirements: { ielts_min: 6.5, gpa_min: "3.2", a_level: "ABB" },
    costs: {
      tuition_min: 24000,
      tuition_max: 42000,
      living_annual: 16000,
      currency: "GBP",
    },
    scholarships: [
      {
        name: "King's International Scholarship",
        value: "£10,000",
        eligibility: "International students",
      },
    ],
    website: "https://www.kcl.ac.uk",
  },
  {
    name: "University of Manchester",
    country: "UK",
    city: "Manchester",
    ranking: 7,
    courses: [
      { name: "MBA", level: "PG", duration: "1 year", fees: "£32,000" },
      {
        name: "Computer Science",
        level: "UG",
        duration: "3 years",
        fees: "£22,000",
      },
      {
        name: "Accounting and Finance",
        level: "UG",
        duration: "3 years",
        fees: "£21,000",
      },
    ],
    requirements: { ielts_min: 6.0, gpa_min: "3.0", a_level: "ABB" },
    costs: {
      tuition_min: 21000,
      tuition_max: 32000,
      living_annual: 11000,
      currency: "GBP",
    },
    scholarships: [
      {
        name: "Manchester Global Scholarship",
        value: "£8,000",
        eligibility: "International students",
      },
    ],
    website: "https://www.manchester.ac.uk",
  },
  {
    name: "University of Bristol",
    country: "UK",
    city: "Bristol",
    ranking: 8,
    courses: [
      {
        name: "Data Science",
        level: "PG",
        duration: "1 year",
        fees: "£28,000",
      },
      { name: "Law", level: "UG", duration: "3 years", fees: "£20,000" },
      {
        name: "Engineering",
        level: "UG",
        duration: "3 years",
        fees: "£24,000",
      },
    ],
    requirements: { ielts_min: 6.0, gpa_min: "3.0", a_level: "ABB" },
    costs: {
      tuition_min: 20000,
      tuition_max: 28000,
      living_annual: 11000,
      currency: "GBP",
    },
    scholarships: [
      {
        name: "Bristol International Scholarship",
        value: "£6,000",
        eligibility: "Academic excellence",
      },
    ],
    website: "https://www.bristol.ac.uk",
  },
  {
    name: "University of Warwick",
    country: "UK",
    city: "Coventry",
    ranking: 9,
    courses: [
      {
        name: "Business Analytics",
        level: "PG",
        duration: "1 year",
        fees: "£30,000",
      },
      {
        name: "Computer Science",
        level: "UG",
        duration: "3 years",
        fees: "£23,000",
      },
      { name: "Economics", level: "UG", duration: "3 years", fees: "£22,000" },
    ],
    requirements: { ielts_min: 6.0, gpa_min: "3.0", a_level: "AAB" },
    costs: {
      tuition_min: 22000,
      tuition_max: 30000,
      living_annual: 10000,
      currency: "GBP",
    },
    scholarships: [
      {
        name: "Warwick Undergraduate Scholarship",
        value: "£5,000",
        eligibility: "Academic excellence",
      },
    ],
    website: "https://warwick.ac.uk",
  },
  {
    name: "University of Glasgow",
    country: "UK",
    city: "Glasgow",
    ranking: 10,
    courses: [
      {
        name: "Software Development",
        level: "PG",
        duration: "1 year",
        fees: "£26,000",
      },
      { name: "Law", level: "UG", duration: "4 years", fees: "£19,000" },
      { name: "Medicine", level: "UG", duration: "5 years", fees: "£38,000" },
    ],
    requirements: { ielts_min: 6.0, gpa_min: "3.0", a_level: "ABB" },
    costs: {
      tuition_min: 19000,
      tuition_max: 38000,
      living_annual: 10000,
      currency: "GBP",
    },
    scholarships: [
      {
        name: "Glasgow International Scholarship",
        value: "£7,000",
        eligibility: "International students",
      },
    ],
    website: "https://www.gla.ac.uk",
  },
  {
    name: "Trinity College Dublin",
    country: "Ireland",
    city: "Dublin",
    ranking: 1,
    courses: [
      {
        name: "Computer Science",
        level: "PG",
        duration: "1 year",
        fees: "€24,000",
      },
      { name: "Business", level: "PG", duration: "1 year", fees: "€22,000" },
      { name: "Law", level: "UG", duration: "4 years", fees: "€18,000" },
    ],
    requirements: { ielts_min: 6.5, gpa_min: "3.0", a_level: "ABB" },
    costs: {
      tuition_min: 18000,
      tuition_max: 24000,
      living_annual: 12000,
      currency: "EUR",
    },
    scholarships: [
      {
        name: "Trinity College Dublin Global Scholarship",
        value: "€10,000",
        eligibility: "Academic excellence",
      },
    ],
    website: "https://www.tcd.ie",
  },
  {
    name: "University College Dublin",
    country: "Ireland",
    city: "Dublin",
    ranking: 2,
    courses: [
      {
        name: "Data Analytics",
        level: "PG",
        duration: "1 year",
        fees: "€22,000",
      },
      { name: "Finance", level: "PG", duration: "1 year", fees: "€20,000" },
      {
        name: "Engineering",
        level: "UG",
        duration: "4 years",
        fees: "€16,000",
      },
    ],
    requirements: { ielts_min: 6.0, gpa_min: "2.8", a_level: "BBB" },
    costs: {
      tuition_min: 16000,
      tuition_max: 22000,
      living_annual: 12000,
      currency: "EUR",
    },
    scholarships: [
      {
        name: "UCD International Scholarship",
        value: "€5,000",
        eligibility: "International students",
      },
    ],
    website: "https://www.ucd.ie",
  },
  {
    name: "National University of Ireland Galway",
    country: "Ireland",
    city: "Galway",
    ranking: 3,
    courses: [
      {
        name: "Biomedical Engineering",
        level: "PG",
        duration: "1 year",
        fees: "€20,000",
      },
      {
        name: "Computer Science",
        level: "UG",
        duration: "4 years",
        fees: "€14,000",
      },
      { name: "Nursing", level: "UG", duration: "4 years", fees: "€12,000" },
    ],
    requirements: { ielts_min: 6.0, gpa_min: "2.8", a_level: "BBB" },
    costs: {
      tuition_min: 12000,
      tuition_max: 20000,
      living_annual: 10000,
      currency: "EUR",
    },
    scholarships: [
      {
        name: "NUIG Global Scholarship",
        value: "€3,000",
        eligibility: "Academic excellence",
      },
    ],
    website: "https://www.nuig.ie",
  },
  {
    name: "University College Cork",
    country: "Ireland",
    city: "Cork",
    ranking: 4,
    courses: [
      {
        name: "Food Science",
        level: "PG",
        duration: "1 year",
        fees: "€18,000",
      },
      { name: "Business", level: "UG", duration: "3 years", fees: "€14,000" },
      { name: "Pharmacy", level: "UG", duration: "5 years", fees: "€16,000" },
    ],
    requirements: { ielts_min: 6.0, gpa_min: "2.8", a_level: "BBB" },
    costs: {
      tuition_min: 14000,
      tuition_max: 18000,
      living_annual: 10000,
      currency: "EUR",
    },
    scholarships: [
      {
        name: "UCC International Scholarship",
        value: "€2,500",
        eligibility: "International students",
      },
    ],
    website: "https://www.ucc.ie",
  },
  {
    name: "Dublin City University",
    country: "Ireland",
    city: "Dublin",
    ranking: 5,
    courses: [
      { name: "Computing", level: "PG", duration: "1 year", fees: "€20,000" },
      {
        name: "Engineering",
        level: "UG",
        duration: "4 years",
        fees: "€14,000",
      },
      {
        name: "Communications",
        level: "UG",
        duration: "3 years",
        fees: "€12,000",
      },
    ],
    requirements: { ielts_min: 6.0, gpa_min: "2.7", a_level: "BBC" },
    costs: {
      tuition_min: 12000,
      tuition_max: 20000,
      living_annual: 12000,
      currency: "EUR",
    },
    scholarships: [
      {
        name: "DCU International Scholarship",
        value: "€2,000",
        eligibility: "Academic excellence",
      },
    ],
    website: "https://www.dcu.ie",
  },
];

/**
 * POST /api/seed/universities
 *
 * Seed the university_profiles table with sample data including embeddings
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    // Check if data already exists
    if (!force) {
      const { count } = await supabase
        .from("university_profiles")
        .select("*", { count: "exact", head: true });

      if (count && count > 0) {
        return NextResponse.json({
          message:
            "Universities already seeded (" +
            count +
            " records). Use ?force=true to re-seed.",
          count,
        });
      }
    }

    const universities_with_embeddings = [];

    for (const uni of UNIVERSITY_DATA) {
      const u = uni;
      // Generate embedding for the university description
      const embed_text = `${u.name} in ${u.city}, ${u.country}. Ranking #${u.ranking}. Courses: ${u.courses.map((c) => c.name).join(", ")}. Requirements: IELTS ${u.requirements.ielts_min}.`;

      try {
        const embeddingRes = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: embed_text,
        });

        universities_with_embeddings.push({
          name: u.name,
          country: u.country,
          city: u.city,
          ranking: u.ranking,
          courses: u.courses,
          requirements: u.requirements,
          costs: u.costs,
          scholarships: u.scholarships,
          website: u.website,
          embedding: embeddingRes.data[0].embedding,
        });
      } catch (embedError) {
        console.error(
          `Failed to generate embedding for ${u.name}:`,
          embedError,
        );
        // Insert without embedding (will work but won't be found via vector search)
        universities_with_embeddings.push({
          name: u.name,
          country: u.country,
          city: u.city,
          ranking: u.ranking,
          courses: u.courses,
          requirements: u.requirements,
          costs: u.costs,
          scholarships: u.scholarships,
          website: u.website,
          embedding: null,
        });
      }
    }

    // Clear existing data if force
    if (force) {
      await supabase
        .from("university_profiles")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
    }

    // Insert all universities
    const { data, error } = await supabase
      .from("university_profiles")
      .insert(universities_with_embeddings)
      .select("id, name, ranking, country");

    if (error) {
      console.error("Failed to seed universities:", error);
      return NextResponse.json(
        { error: "Failed to seed universities", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Universities seeded successfully",
      count: data?.length || 0,
      universities: data,
    });
  } catch (error) {
    console.error("University seeding error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/seed/universities
 *
 * Get seeding status
 */
export async function GET() {
  try {
    const { count } = await supabase
      .from("university_profiles")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      seeded: (count || 0) > 0,
      count: count || 0,
    });
  } catch (error) {
    console.error("Error checking seed status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
