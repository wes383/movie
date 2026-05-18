import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

let cachedIds: number[] | null = null;
let lastCacheTime = 0;

const CACHE_DURATION = 1000 * 60 * 5;

async function getMovieIds(): Promise<number[]> {
  const now = Date.now();

  if (
    cachedIds &&
    cachedIds.length > 0 &&
    now - lastCacheTime < CACHE_DURATION
  ) {
    return cachedIds;
  }

  const { data, error } = await supabase
    .from("movies")
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    return [];
  }

  cachedIds = data.map((movie) => movie.id);
  lastCacheTime = now;

  return cachedIds;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getSeededIndex(seed: number, length: number): number {
  return Math.floor(seededRandom(seed) * length);
}

function getRandomIndex(length: number): number {
  return Math.floor(Math.random() * length);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seedParam = searchParams.get("seed");

    const movieIds = await getMovieIds();

    if (movieIds.length === 0) {
      return NextResponse.json(
        { error: "No movies found" },
        { status: 404 }
      );
    }

    let selectedMovieId: number;

    if (seedParam !== null) {
      const seed = parseInt(seedParam, 10);

      if (isNaN(seed)) {
        return NextResponse.json(
          { error: "Invalid seed parameter" },
          { status: 400 }
        );
      }

      const index = getSeededIndex(seed, movieIds.length);
      selectedMovieId = movieIds[index];
    } else {
      const index = getRandomIndex(movieIds.length);
      selectedMovieId = movieIds[index];
    }

    const { data: movie, error } = await supabase
      .from("movies")
      .select("*")
      .eq("id", selectedMovieId)
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          hint: error.hint ?? null,
          details: error.details ?? null,
        },
        { status: 500 }
      );
    }

    if (!movie) {
      return NextResponse.json(
        { error: "Movie not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(movie);
  } catch (error) {
    console.error("Random movie API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown server error",
      },
      { status: 500 }
    );
  }
}