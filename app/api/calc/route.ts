import { NextResponse } from "next/server";
import { calculate, CalcInput } from "@/lib/calc";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CalcInput;
    const result = calculate(body);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return new NextResponse("Invalid input", { status: 400 });
  }
}
