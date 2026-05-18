import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

let cachedIds: number[] | null = null;
let cacheTime = 0;

const CACHE_DURATION = 1000 * 60 * 5;

async function getMovieIds() {
  const now = Date.now();

  if (cachedIds && now - cacheTime < CACHE_DURATION) {
    return cachedIds;
  }

  const { data, error } = await supabase
    .from("movies")
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  cachedIds = data.map((m) => m.id);
  cacheTime = now;

  return cachedIds;
}

function stringToHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seed = searchParams.get("seed");

    const ids = await getMovieIds();

    if (!ids.length) {
      return NextResponse.json(
        { error: "No movies found" },
        { status: 404 }
      );
    }

    let selectedId: number;

    if (seed !== null) {
      let seedNum: number;
      
      if (/^\d+$/.test(seed)) {
        seedNum = parseInt(seed, 10);
      } else {
        seedNum = stringToHash(seed);
      }

      const index = Math.floor(
        seededRandom(seedNum) * ids.length
      );

      selectedId = ids[index];
    } else {
      const index = Math.floor(Math.random() * ids.length);
      selectedId = ids[index];
    }

    const { data: movie, error } = await supabase
      .from("movies")
      .select("*")
      .eq("id", selectedId)
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(movie);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}
