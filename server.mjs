import { createServer } from 'http';
import { parse } from 'url';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import next from 'next';
import { WebSocketServer } from 'ws';
import { GoogleGenAI, Modality } from '@google/genai';

// In production mode (dev: false), Next.js strictly requires .next/BUILD_ID,
// .next/routes-manifest.json, .next/prerender-manifest.json, and .next/server/app-paths-manifest.json.
const buildIdFile = join(process.cwd(), '.next', 'BUILD_ID');
const routesManifest = join(process.cwd(), '.next', 'routes-manifest.json');
const appPathsManifest = join(process.cwd(), '.next', 'server', 'app-paths-manifest.json');
const prerenderManifest = join(process.cwd(), '.next', 'prerender-manifest.json');

const hasCompleteBuild = existsSync(buildIdFile) &&
                         existsSync(routesManifest) && 
                         existsSync(appPathsManifest) && 
                         existsSync(prerenderManifest);

// When a production build exists, serve with dev: false. This prevents CPU pegging,
// on-demand compilation stalls, and 500 Internal Server Errors in containers.
const dev = process.env.FORCE_DEV === 'true' ? true : !hasCompleteBuild;

const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Prompt Compiler for Gemini Live System Instructions
function compileSystemPrompt(owner, menuItems) {
  const restaurantName = owner.restaurant_name || "Sing Sing Beer & Pizza";
  const tone = owner.tone || "Lively & Casual";
  const greeting = owner.greeting || `Thanks for calling ${restaurantName}, this is your virtual host, how can I help you today?`;

  const activeItems = (menuItems || []).filter(i => !i.is_86);
  const soldOutItems = (menuItems || []).filter(i => i.is_86);

  const activeMenuText = activeItems.length > 0
    ? activeItems.map(i => {
        const dietary = i.dietary_tags && i.dietary_tags.length > 0 ? ` (${i.dietary_tags.join(', ')})` : '';
        const aiPitch = i.ai_description ? ` [Recommendation Guide: ${i.ai_description}]` : '';
        return `- ${i.item_name} ($${Number(i.price).toFixed(2)}, ${i.station}, ${i.cook_time_minutes} mins) - ${i.description}${dietary}${aiPitch}`;
      }).join('\n')
    : `- Pho Bo ($18.25, Noodle Line, 6 mins) - Rare steak, beef brisket, bean sprouts, cilantro, green onion, basil, rice noodles (Dairy-Free)
- Pho Ga ($17.75, Noodle Line, 6 mins) - Lemongrass chicken, quail eggs, bean sprouts, cilantro, green onion, basil, rice noodles (Dairy-Free)
- Brisket & Kimchi Pizza ($21.25, Pizza Oven, 4 mins) - Hoisin, mozzarella, green onion, pickled onion, spicy mayo, sesame
- Margherita Pizza ($18.75, Pizza Oven, 3 mins) - Mozzarella, tomato sauce, pesto, fresh basil (Vegetarian)
- Katsu Chicken Burger ($22.25, Grill, 10 mins) - Crispy fried, bulldog sauce, cabbage, kewpie, potato roll
- Wings ($17.75, Fryer, 12 mins) - Red chili sauce, sriracha parm dip
- Calamari ($18.25, Fryer, 8 mins) - Salsa verde, citrus, smoked paprika (Pescatarian)`;

  const soldOutText = soldOutItems.length > 0
    ? soldOutItems.map(i => `- 86'd / SOLD OUT: ${i.item_name}`).join('\n')
    : "None currently 86'd.";

  return `// --- SECTION 1: OWNER'S CUSTOM PERSONA (DYNAMIC) ---
You are the virtual host for ${restaurantName}.
Your tone is ${tone}.
When the call connects, you must greet the caller with exactly this sentence: "${greeting}"

// --- SECTION 2: IMMUTABLE SYSTEM RULES (HARD-CODED) ---
UNDER NO CIRCUMSTANCES CAN YOU VIOLATE THE FOLLOWING RULES:
1. THE BOUNDARY RULE:
You only collect intent and data. You NEVER process payments over the phone. You do not assign physical tables or check real inventory yourself. You rely strictly on system context and emit structured data for the backend.

2. THE AVAILABILITY RULE (THE "GREEN LIGHT" RULE):
If a caller asks for a reservation, you MUST trigger the 'check_availability' tool first. You cannot say "yes" or confirm any booking until the backend returns {"status": "available"}.
- Latency masking: Use polite, natural conversational fillers while the check runs ("Hmm, let me check our floor plan for that time real quick...", "Right away, checking our availability now...").
- If unavailable: The tool will return alternatives (e.g. 7:30 PM or 8:45 PM). Pivot smoothly and offer those times.

3. THE "PACKED HOUSE" RULE:
Never outright reject a customer if private tables are full. You MUST pivot and offer communal seating, bar seating, or the waitlist. If the current venue is 100% full, you MUST offer a reservation at a sister venue.

4. THE MENU TRUTH & INVENTORY "86" RULE:
You may only offer items currently listed as "available" in your context window. If an item is marked "sold out" or "86'd", you are strictly forbidden from selling it. You must apologize and immediately suggest a similar available alternative.

CURRENT AVAILABLE MENU MATRIX:
${activeMenuText}

CURRENT 86'D / SOLD OUT ITEMS:
${soldOutText}

5. THE KITCHEN PACING RULE:
For all takeout/delivery food orders, you MUST establish if it is for "ASAP" or scheduled for a specific time. Phase 3 Kitchen Pacing needs this exact timestamp to pace cooking. Trigger the 'submit_food_order' tool with items, timing, name, and phone.

6. THE PAYMENT SECURITY RULE:
You are strictly forbidden from asking for, recording, or listening to credit card numbers over the phone. For phone orders, you MUST state: "I am sending a secure checkout link to your phone right now."

7. THE FINAL HANDOFF & JSON RULE:
When the conversation naturally concludes, you MUST trigger the 'submit_reservation_data' or 'submit_food_order' tool to send the finalized payload to the backend. Do not hang up until this is executed.

8. THE LIVELY PERSONA RULE:
You must use active conversational fillers ("Hmm", "Ah, I see", "Certainly", "Right away") and polite Canadian terminology (washroom, lineup, bill). Never sound robotic or read raw lists out loud.`;
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('internal server error');
      }
    }
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url, true);
    if (pathname === '/api/live') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
  });

  wss.on('connection', async (clientWs, req) => {
    try {
      const parsedUrl = parse(req.url, true);
      const venue = parsedUrl.query.venue || 'Sing Sing (Main St)';

      // Dynamically load owner config and menu matrix
      let ownerConfig = {
        voice_name: "Puck",
        restaurant_name: "Sing Sing Beer & Pizza",
        greeting: "Thanks for calling Sing Sing Beer & Pizza, this is your virtual host, how can I help you today?",
        tone: "Lively & Casual"
      };

      try {
        const cfgPath = join(process.cwd(), 'owner_config.json');
        if (existsSync(cfgPath)) {
          ownerConfig = { ...ownerConfig, ...JSON.parse(readFileSync(cfgPath, 'utf8')) };
        }
      } catch (e) {
        console.warn("Could not read owner_config.json", e);
      }

      let menuItems = [];
      try {
        const menuPath = join(process.cwd(), 'menu_matrix.json');
        if (existsSync(menuPath)) {
          menuItems = JSON.parse(readFileSync(menuPath, 'utf8'));
        }
      } catch (e) {
        console.warn("Could not read menu_matrix.json", e);
      }

      const selectedVoice = parsedUrl.query.voice || ownerConfig.voice_name || 'Puck';
      const systemInstruction = compileSystemPrompt(ownerConfig, menuItems);

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey === 'MY_GEMINI_API_KEY') {
        console.warn('⚠️ [Voice Concierge] GEMINI_API_KEY is missing or unset in your .env.local file. Voice streaming requires a valid Gemini API key from https://aistudio.google.com/app/apikey');
        if (clientWs.readyState === 1) {
          clientWs.send(JSON.stringify({ 
            error: "GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your .env.local file to enable the live voice concierge." 
          }));
        }
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      let session = null;

      session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
          },
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          tools: [{
            functionDeclarations: [
              {
                name: "check_availability",
                description: "Checks the backend 15-minute grid and Turn Time math for table overlaps.",
                parameters: {
                  type: "object",
                  properties: {
                    party_size: { 
                      type: "integer", 
                      description: "The number of guests in the party" 
                    },
                    target_time: { 
                      type: "string", 
                      description: "Target reservation time in HH:MM format (24-hour time, e.g. 20:00 for 8:00 PM, 19:30 for 7:30 PM)" 
                    },
                    venue: { 
                      type: "string", 
                      description: "The venue name, strictly: Sing Sing" 
                    }
                  },
                  required: ["party_size", "target_time", "venue"]
                }
              },
              {
                name: "submit_reservation_data",
                description: "Emits the finalized, backend-approved contract to lock the table in PostgreSQL and trigger the SMS confirmation.",
                parameters: {
                  type: "object",
                  properties: {
                    party_size: { 
                      type: "integer", 
                      description: "The finalized party size (number of guests)" 
                    },
                    confirmed_time: { 
                      type: "string", 
                      description: "Confirmed reservation time in HH:MM format (e.g. 19:30 or 20:45)" 
                    },
                    customer_name: { 
                      type: "string", 
                      description: "The customer's full name" 
                    },
                    customer_phone: { 
                      type: "string", 
                      description: "The customer's contact phone number for SMS confirmation" 
                    },
                    venue: { 
                      type: "string", 
                      description: "The venue name: Sing Sing" 
                    }
                  },
                  required: ["party_size", "confirmed_time", "customer_name", "customer_phone", "venue"]
                }
              },
              {
                name: "submit_food_order",
                description: "Submits a takeout or pickup food order directly to the Sing Sing Phase 3 Kitchen Pacing Engine and KDS.",
                parameters: {
                  type: "object",
                  properties: {
                    customer_name: {
                      type: "string",
                      description: "The caller or guest's name"
                    },
                    customer_phone: {
                      type: "string",
                      description: "Customer contact phone for secure payment link and SMS status"
                    },
                    timing: {
                      type: "string",
                      description: "Pickup timing: 'ASAP' or scheduled timestamp (e.g. 19:45)"
                    },
                    items: {
                      type: "array",
                      description: "List of items ordered from the Sing Sing Menu Matrix",
                      items: {
                        type: "object",
                        properties: {
                          item_name: { type: "string" },
                          quantity: { type: "integer" }
                        },
                        required: ["item_name"]
                      }
                    }
                  },
                  required: ["customer_name", "customer_phone", "timing", "items"]
                }
              }
            ]
          }]
        },
        callbacks: {
          onmessage: (message) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio && clientWs.readyState === 1) clientWs.send(JSON.stringify({ audio }));
            
            if (message.serverContent?.interrupted && clientWs.readyState === 1)
              clientWs.send(JSON.stringify({ interrupted: true }));

            const functionCalls = message.toolCall?.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
              for (const call of functionCalls) {
                if (call.name === "check_availability") {
                  const targetTime = String(call.args?.target_time || '').trim();
                  const partySize = Number(call.args?.party_size) || 2;
                  const reqVenue = call.args?.venue || venue;

                  console.log(`[Tool Call: check_availability] venue=${reqVenue}, size=${partySize}, time=${targetTime}`);

                  // 15-Minute Grid Math: 20:00 (8:00 PM) is fully booked and returns alternatives [19:30, 20:45]
                  // Other times (e.g. 19:30, 20:45, 18:00, 19:00, etc.) are available!
                  let responsePayload;
                  if (targetTime === '20:00' || targetTime.includes('20:00') || targetTime === '8:00 PM' || targetTime === '8:00' || targetTime === '08:00 PM') {
                    responsePayload = {
                      status: "unavailable",
                      alternatives: ["19:30", "20:45"]
                    };
                  } else {
                    responsePayload = {
                      status: "available"
                    };
                  }

                  // Inform client UI of availability check
                  if (clientWs.readyState === 1) {
                    clientWs.send(JSON.stringify({
                      toolEvent: 'check_availability',
                      callId: call.id,
                      arguments: call.args,
                      result: responsePayload
                    }));
                  }

                  session.sendToolResponse({
                    functionResponses: [{
                      id: call.id,
                      name: call.name,
                      response: responsePayload
                    }]
                  });
                } else if (call.name === "submit_reservation_data") {
                  console.log(`[Tool Call: submit_reservation_data] args=`, call.args);
                  
                  if (clientWs.readyState === 1) {
                    clientWs.send(JSON.stringify({ 
                      functionCall: {
                        name: call.name,
                        arguments: call.args
                      } 
                    }));
                  }

                  session.sendToolResponse({
                    functionResponses: [{
                      id: call.id,
                      name: call.name,
                      response: { 
                        status: "locked",
                        confirmation_id: "RES-" + Math.floor(100000 + Math.random() * 900000),
                        sms_status: "queued" 
                      }
                    }]
                  });
                } else if (call.name === "submit_food_order") {
                  console.log(`[Tool Call: submit_food_order] args=`, call.args);
                  
                  if (clientWs.readyState === 1) {
                    clientWs.send(JSON.stringify({ 
                      functionCall: {
                        name: call.name,
                        arguments: call.args
                      } 
                    }));
                  }

                  session.sendToolResponse({
                    functionResponses: [{
                      id: call.id,
                      name: call.name,
                      response: { 
                        status: "paced_and_queued",
                        order_id: "TKT-" + Math.floor(100 + Math.random() * 900),
                        kitchen_status: "hold_queue_active",
                        sms_payment_link: "sent"
                      }
                    }]
                  });
                }
              }
            }
          },
          onclose: () => {
            if (clientWs.readyState === 1) clientWs.send(JSON.stringify({ status: "disconnected" }));
          },
          onerror: (err) => {
            console.error("Gemini connection error", err);
            if (clientWs.readyState === 1) clientWs.send(JSON.stringify({ error: err.message }));
          }
        },
      });

      // Send initial context about the venue
      session.sendClientContent({
        turns: [
          {
            role: 'user',
            parts: [{ text: `[System Context: The caller is calling the ${venue} venue. Greet them accordingly.]` }]
          }
        ],
        turnComplete: true
      });

      clientWs.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
          if (parsed.end) {
            if (session) {
                session.sendClientContent({
                    turns: [
                        {
                            role: 'user',
                            parts: [{ text: 'Goodbye' }]
                        }
                    ],
                    turnComplete: true
                });
            }
          }
        } catch (err) {
          console.error("Error parsing message", err);
        }
      });
      
      clientWs.on('close', () => {
        // We can't close the session explicitly with close() unless the API exposes it,
        // but we can just let it gc, or if session.close exists, call it.
        // Usually session.close is not exposed or not necessary, we just drop the ref.
      });

      clientWs.on('error', (err) => {
        console.error("Client WebSocket error:", err);
      });

    } catch (err) {
      console.error("Error connecting to Gemini", err);
      try {
        clientWs.send(JSON.stringify({ error: "Failed to connect to AI" }));
        clientWs.close();
      } catch (closeErr) {
        console.error("Error closing client ws", closeErr);
      }
    }
  });

  wss.on('error', (err) => {
    console.error("WebSocket server error:", err);
  });

  server.once('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port} (mode: ${dev ? 'development' : 'production'})`);
  });
}).catch((err) => {
  console.error('Failed to initialize Next.js server:', err);
  process.exit(1);
});
