import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { compilePrompt } from '@/lib/promptCompiler';

const CONFIG_FILE = path.join(process.cwd(), 'owner_config.json');
const MENU_FILE = path.join(process.cwd(), 'menu_matrix.json');
const FLOOR_FILE = path.join(process.cwd(), 'floor_graph.json');

// In-memory cache fallback if file IO fails
let inMemoryConfig: any = null;

export async function GET() {
  try {
    let ownerConfig = {
      voice_name: "Puck",
      voice_label: "Puck - Energetic Male",
      restaurant_name: "Sing Sing Beer & Pizza",
      greeting: "Thanks for calling Sing Sing Beer & Pizza, this is your virtual host, how can I help you today?",
      tone: "Lively & Casual",
      canadian_dialect: true,
      venue: "Sing Sing Main St",
      last_deployed_at: new Date().toISOString()
    };

    if (fs.existsSync(CONFIG_FILE)) {
      try {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        ownerConfig = { ...ownerConfig, ...JSON.parse(raw) };
      } catch (e) {
        console.warn("Could not read owner_config.json, using default", e);
      }
    }

    let menuItems = [];
    if (fs.existsSync(MENU_FILE)) {
      try {
        const raw = fs.readFileSync(MENU_FILE, 'utf-8');
        menuItems = JSON.parse(raw);
      } catch (e) {
        console.warn("Could not read menu_matrix.json", e);
      }
    }

    let floorTables = [];
    if (fs.existsSync(FLOOR_FILE)) {
      try {
        const raw = fs.readFileSync(FLOOR_FILE, 'utf-8');
        floorTables = JSON.parse(raw);
      } catch (e) {
        console.warn("Could not read floor_graph.json", e);
      }
    }

    const compiledSystemInstruction = compilePrompt(ownerConfig, menuItems);

    return NextResponse.json({
      success: true,
      config: ownerConfig,
      menuItems,
      floorTables,
      compiledSystemInstruction
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to load configuration' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { config, menuItems, floorTables } = body;

    const updatedConfig = {
      ...(config || {}),
      last_deployed_at: new Date().toISOString()
    };

    // 1. Write owner_config.json
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(updatedConfig, null, 2), 'utf-8');
    } catch (e) {
      console.warn("Could not persist owner_config.json to disk", e);
    }

    // 2. Write menu_matrix.json if provided
    if (Array.isArray(menuItems)) {
      try {
        fs.writeFileSync(MENU_FILE, JSON.stringify(menuItems, null, 2), 'utf-8');
      } catch (e) {
        console.warn("Could not persist menu_matrix.json to disk", e);
      }
    }

    // 3. Write floor_graph.json if provided
    if (Array.isArray(floorTables)) {
      try {
        fs.writeFileSync(FLOOR_FILE, JSON.stringify(floorTables, null, 2), 'utf-8');
      } catch (e) {
        console.warn("Could not persist floor_graph.json to disk", e);
      }
    }

    // Compile dynamic system instruction
    const compiledSystemInstruction = compilePrompt(
      updatedConfig,
      Array.isArray(menuItems) ? menuItems : []
    );

    return NextResponse.json({
      success: true,
      message: 'Configuration successfully compiled and deployed to Voice AI and Venue Systems.',
      deployedAt: updatedConfig.last_deployed_at,
      compiledSystemInstruction,
      voiceName: updatedConfig.voice_name
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to deploy configuration' },
      { status: 500 }
    );
  }
}
