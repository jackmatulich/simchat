const { Anthropic } = require('@anthropic-ai/sdk');
const fetch = require('node-fetch');
const { ConvexHttpClient } = require("convex/browser");

const DEFAULT_SYSTEM_PROMPT = `
You are a clinical simulation specialist who's job it is to provided perfect scenario files for use in specific clinical simulation software. You are highly skilled and experienced in all areas of clinical practice and will generate scenarios that are high quality, accurate, realistic and relevant. 
In this JSON file there are instructions on how to fill all details. 
Please follow the instructions precisely. Issues can easily arise from you adding or changing code beyond the instructions within and the request I provide here. Please remove the instructions when you return so that the JSON is functional. 
I want you to return a complete scenario based on what is requested.
For labs, if you decide to include a panel then you will include the whole panel as per the JSON, not removing any of the values.
Here is the JSON:
{
    "scenarioId": "", // Should be a unique UUID, example: 9BC8EB3-7002-4F8A-9A12-119A596A53BF, ensure same format but make random.
    "scenarioType": "Vital Signs", // Default - Vital Signs, CriticalCare - Critical Care, Cardionics - Stethoscope, Ventilator - Ventilator
    "scenarioVersion": 0,
    "scenarioName": "", //Name of the scenario
    "scenarioTime": 600, // In seconds. The duration of the scenario
    "isDemo": false, // Do NOT change
    "isALSILegacy": false, // Do NOT change
    "scenarioMonitorType": 1, // monitor ID, must be licensed       // Do NOT change

        "intended_participants": [
          "", "" //List intended participants making sure to cover: experience level, speciality (if relevant) and profession. eg. Junior Cardiology Nurses
        ],
        "purpose": "", //Briefly outline the purpose of the simulation scenario, 40–60 words.
        "scenario_overview": "", //Provide a 2–3 sentence description of the scenario context, patient situation, and major turning point.
        "learning_objectives": [
          "", "" //List clear, action-oriented objectives using verbs like "identify", "perform", "demonstrate"
        ],
        "required_simulation_tools": [
          "", ""  //List all essential equipment or resources needed (e.g., manikin, monitor, simulated meds)
       
        ],
        "debriefing_points": [
          "", "" //Outline key reflective or feedback topics aligned to learning objectives
        ],
        "handover": {
          "time_of_day": "", //Time at which scenario begins (e.g., “0730h”)
          "handover_reason": "", //Reason for handover (e.g., shift change, admission, ward round)
          "confederate_role": "", //Role of confederate providing handover (e.g., night shift nurse)
          "what_is_about_to_happen": "", //Describe what the participants will soon observe or respond to
          "SBAR": {
            "situation": "", //One-sentence patient situation
            "background": "", //One or two sentences on patient history
            "assessment": "", //Summary of current clinical status
            "recommendation": "" //Suggested next steps or concerns for escalation
          }
        },

    "scenarioEvents": [
        //Duplicate, fill and follow comment instructions for the following Scenario Event object for each event in the scenario.
        { // Scenario Event
            "description": "", // Description of the event
            "monitorType": 0, // Do NOT change
            "trendTime": 0, // The trending time for the value changes in seconds
            "jumpTime": 0, // Do NOT change
            "defibShock": false, //If defbrilation should progress scenario to next event
            "defibDisarm": false, //If defbrilation DISARM should progress scenario to next event
            "type" : "ScenarioEvent",//Do Not change
            "name": "", // Name of the event
            "parameters": {
                // for each parameter/value in this parameters object: if relevant to the event keep & fill in the value, if not relevant to the event, remove entirely from this parameters object.
                // IF the parameter is BECOMING or CEASING to be visible in the event then keep, else remove from this object. 
                //IF no change from last state, remove from this object.
                "hr": 0, // Heart rate per min
                "bpSys": 0, // Systolic blood pressure in mmHg
                "bpDia": 0, // Diastolic blood pressure in mmHg
                "spo2": 0, // SpO2 in %
                "etco2": 0, // EtCO2 in mmHg
                "respRate": 0, // Respiration rate per min
                "temp": 0, // Temperature degrees celcius
                "cust1": 0, // Do NOT change
                "cust2": 0, // Do NOT change
                "cust3": 0, // Do NOT change
                "cvp": 10, // CVP in mmHg
                "cvpWaveform": 0, // CVP waveform ID Use only: 0=Normal, 1=Large V, 2=Large A, 3=Cannon A, 4=Loss of Y, 5=Prominent X/Y, 6=ASD
                "cvpVisible": false, // CVP visibility, unless relevant for the scenario & context then leave false
                "cvpAmplitude": 2, // CVP amplitude
                "cvpVariation": 1, // CVP variation
                "icp": 10, // ICP in mmHg Use only: 0=Normal, 1=Flat, 2=Prominent P1 wave, 3=Diminished P1 wave, 4=Prominent P2 wave, 5=Diminished P2 and P3 waves, 6=Rounded
                "icpWaveform": 0, // ICP waveform ID 
                "icpVisible": false, // ICP visibility, unless relevant for the scenario & context then leave false
                "icpAmplitude": 2, // ICP amplitude
                "icpVariation": 1, // ICP variation
                "icpLundbergAEnabled": false, // ICP Lundberg A
                "icpLundbergBEnabled": false, // ICP Lundberg B
                "papSys": 20, // PASP in mmHg
                "papDia": 10, // PADP in mmHg
                "papWaveform": 0, // PAP waveform ID Use only: 0=Right atrium, 1=Right ventricle, 2=Pulmonary artery, 3=Pulmonary artery wedge
                "papVisible": false, // PAP visibility, unless relevant for the scenario & context then leave false
                "papVariation": 2, // PAP variation
                "ecgWaveform": 9, // ECG waveform ID // ECG waveform ID. Use ONLY one of the following valid values: ... (truncated for brevity, but full prompt will be inserted)
            },
            "relatedChecklist": [0], // Check list items from checklist object, referenced by number staring first at 0. If no checklist items, use object [0]
            "relatedLabs": [0], // Reference number of lab/s relevant for this state, starting at 0 in order as per Labs object. If no labs items, use object [0]
        }
    ],
    "scenarioStory": {
        "history": "",
        "course": "",
        "discussion": ""
    },
    "patientInformation": {
        "patientName": "", // Name of the patient, create name relevant to the scenario age, gender, and condition
        "patientSex": 0, // 1 - Male, 2 - Female, 0 - Unspecified
        "patientAgeCategory": 0, // Adult - 0, Paediatric - 1, Neonate - 2 | undefined - undefined is for legacy which just has age years
        "patientAge": 30,
        "patientAgeUnit": "", // | years, | days, | weeks, | months
        "patientHeight": 0, // | OR undefined - for legacy
        "patientWeight": 0, // | OR undefined - for legacy. Treated as Ideal Body Weight by the ventilator
        "patientCondition": "", // Condition of the patient | OR undefined - for legacy
        "patientAdmitted": 0, // Number of days before today
        "patientPhotoId": 0 // CEILING(patientAge x1.3) (rounded up)
    },

        "patient_actor_information": {
    "character_background": {
      "date_of_birth": "", //In ISO format (e.g., "1957-03-22")
      "occupation": "", //Current or former occupation
      "marital_status": "", //Relationship status (e.g., single, married, widowed)
      "support_system": "", //Mention family or friends involved
      "lifestyle": "" //Relevant personal habits (e.g., smoking, alcohol, activity level)
    },
    "medical_history": {
      "recent_procedures": "", //Include any surgeries or hospital stays
      "current_concerns": "" //Brief statement about what is bothering the patient now
    },
    "personality_and_demeanor": {
      "general_demeanor": "", //Describe how the patient should behave (e.g., anxious, irritable)
      "communication_style": "", //Preferred style (e.g., brief, chatty, avoids jargon)
      "emotional_state": "" //Current emotional condition (e.g., worried, calm, confused)
    },
    "current_scenario_context": {
      "current_state": "", //Short summary of symptoms and status at the start
      "possible_questions_from_participants": {
        "pain_and_symptoms": "", //Sample patient responses to questions about symptoms
        "personal_information": "", //Sample responses about home life or interests
        "medical_history": "" //Responses if asked about previous illnesses
      }
    },
    "guidance_for_role_playing": {
      "what_to_emphasize": "", //Key symptoms or behaviors to portray
      "how_to_respond_to_care": "" //Guidance on patient cooperation or deterioration
    }
  },
    "checklist": [
        // Add expected participant actions as checklist items by duplicating and filling the object below, in order of occurence through sim. MAX 10 per event, aim <5. 
        { 
            "value" : 0,  // do not change.
            "title" : "text", // Check list item name.
            "icon" : 0, // do not change.
            "type" : "Check" // checklist item type, do not change.
    }
],
    "labs": [ // For each state consider if any of the lab panels here are relevant.  If yes, keep/duplicate the panel and fill the values as appropriate. Remove all  PANEL objects that are not needed.  You are not to remove any of the tests within the panels.  Ensure lab values are listed in order to inform the numerical value in each state for "relatedLabs". You are NOT to create new labs/panels beyond what is here UNLESS the user has SPECIFICALLY asked for these.
        {
            "name": "Coagulation Studies", // Do NOT edit this value
            "description": "", // Do NOT edit this value
            "parameters": [ ... (truncated for brevity)
        }
    ], //end labs
    "scenarioDefaultEnergy": 200, // Default energy for the scenario, do not change
    "scenarioDefaultPacerThreshold": 50, // Default pacer threshold for the scenario, do not change

"scenarioState": 0, // 0 - initial, 1 - running, 2 - paused, 3 - finished
"studentInfo": {
    "studentName": "",
    "studentNumber": "",
    "studentEmail": ""
}
}`;

// Helper to add a message to Convex using the backend client
async function addMessageToConvex(conversationId, message) {
  const convexUrl = process.env.CONVEX_URL;
  const convexAdminKey = process.env.CONVEX_ADMIN_KEY;
  if (!convexUrl || !convexAdminKey) {
    throw new Error('Missing Convex URL or admin key in environment variables.');
  }
  // Use only .convex.cloud for backend client
  if (!convexUrl.endsWith('.convex.cloud')) {
    throw new Error('CONVEX_URL must end with .convex.cloud for backend client calls.');
  }
  const convex = new ConvexHttpClient(convexUrl, { adminKey: convexAdminKey });
  return await convex.mutation("conversations:addMessage", {
    conversationId,
    message,
  });
}

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { messages, systemPrompt, conversationId } = body;
    console.log('Received request body:', JSON.stringify(body, null, 2));
    console.log('Messages type:', typeof messages);
    console.log('Messages value:', messages);
    console.log('Is array?', Array.isArray(messages));

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Missing API key: Please set ANTHROPIC_API_KEY in your environment variables.' }),
      };
    }
    if (!messages || !Array.isArray(messages)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid request: messages parameter is required and must be an array', received: typeof messages }),
      };
    }
    if (!conversationId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing conversationId in request body.' }),
      };
    }

    const anthropic = new Anthropic({ apiKey, timeout: 120000 });
    const formattedMessages = messages
      .filter((msg) => msg.content && msg.content.trim() !== '' && !msg.content.startsWith('Sorry, I encountered an error'))
      .map((msg) => ({ role: msg.role, content: msg.content.trim() }));
    if (formattedMessages.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No valid messages to send' }),
      };
    }
    const finalSystemPrompt = systemPrompt?.enabled
      ? `${DEFAULT_SYSTEM_PROMPT}\n\n${systemPrompt.value}`
      : DEFAULT_SYSTEM_PROMPT;

    // Generate AI response
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 10000,
      system: finalSystemPrompt,
      messages: formattedMessages,
    });
    const aiContent = response.content[0]?.text || '';
    const aiMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: aiContent,
    };
    // Store the AI response in Convex
    await addMessageToConvex(conversationId, aiMessage);
    // Return 202 Accepted for background function
    return {
      statusCode: 202,
      headers,
      body: JSON.stringify({ status: 'AI response queued and will appear in chat when ready.' }),
    };
  } catch (error) {
    console.error('Error in genAIResponse-background:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
}; 