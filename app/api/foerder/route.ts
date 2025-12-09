import { NextResponse } from "next/server";
import { calculateFoerder, FoerderInput } from "@/lib/foerder";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FoerderInput;
    const result = calculateFoerder(body);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error(err);
    return new NextResponse(err.message ?? "Invalid input", { status: 400 });
  }
}
