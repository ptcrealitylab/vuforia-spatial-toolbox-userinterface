import {getFrameText} from '../gui/search.js';
import {apiKey} from './config.js';

const SYSTEM_PROMPT = `Act like an industry expert. You will be provided with information about an area delimited by triple quotes. You will then receive a question from a local technician working in this area. You should attempt to answer the technician's question using the provided area information. First, if you need additional information or context, you should use function calls. Second, answer concisely in one to two sentences.`;
const SYSTEM_PROMPT_IMAGE = `Describe what you can see in the image, and generate the description so it is suitable to be used for alt-text preserving as much unique information as possible.`;

const tools = [{
    'type': 'function',
    'function': {
        name: 'search_tools',
        description: 'Search for text within nearby tools. Returns an array of descriptions of any matching tools.',
        parameters: {
            type: 'object',
            properties: {
                text: {
                    type: 'string',
                    description: 'The text to search for'
                },
            },
            required: ['text'],
        },
    },
}];
/*, {
  'type': 'function',
  'function': {
    name: 'take_picture',
    description: 'Take a picture of the current space',
  },
}]; */

async function takePictureAndSummarize() {
    if (!apiKey) {
        return 'missing api key';
    }

    const snapshot = await realityEditor.app.promises.get3dSnapshot();
    const messages = [{
        role: 'system',
        content: SYSTEM_PROMPT_IMAGE,
    }, {
        role: 'user',
        content: [{
            type: 'image',
            image_url: {
                url: snapshot.texture,
            }
        }],
    }];

    const body = {
        model: 'gpt-4-vision-preview',
        max_tokens: 4096,
        temperature: 0,
        messages,
    };

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        console.log('got openai', data);
        return data.choices[0].message.content;
    } catch (error) {
        console.error('not openai', error);
    }
}

function searchTools(query) {
    if (query.length === 0) {
        return [];
    }
    // `There is one pdf document in the space with the text "${args.text}"`; // Could not find any tools for query "${args.text}"`;
    let matches = [];
    let frames = realityEditor.worldObjects.getBestWorldObject().frames;
    for (const frameId in frames) {
        const frame = frames[frameId];
        let envText = getFrameText(frame);
        if (envText.toLowerCase().includes(query)) {
            matches.push(envText);
        }
    }
    return JSON.stringify(matches);
}

async function doToolCalls(toolCalls) {
    let results = [];
    for (let call of toolCalls) {
        let content = '';
        let fn = call['function'];
        try {
            let args = JSON.parse(fn['arguments']);
            switch (fn.name) {
            case 'take_picture':
                content = await takePictureAndSummarize();
                break;
            case 'search_tools':
                content = await searchTools(args.text);
                break;
            }
        } catch (e) {
            console.warn('Unable to call function', e);
            content = 'Error: unable to call function';
        }

        results.push({
            tool_call_id: call.id,
            role: 'tool',
            name: fn.name,
            content,
        });
    }

    return results;
}

function getMotionStudyInformation() {
    let hpa = realityEditor.motionStudy.getActiveHumanPoseAnalyzer();
    if (!hpa) {
        return 'No person seen.';
    }
    let desc = [];
    for (const id of Object.keys(hpa.poseRenderInstances)) {
        if (!id.startsWith('_HUMAN')) {
            continue;
        }
        const poseRenderInstance = hpa.poseRenderInstances[id];
        const pose = poseRenderInstance.pose;
        desc.push('There is a person in the space.');
        let anyBad = false;
        for (const jointName of Object.keys(pose.joints)) {
            let jointInfo = pose.joints[jointName];
            if (jointName.split('_').length > 2) {
                continue;
            }
            if (jointInfo.rebaScore > 3) {
                anyBad = true;
                desc.push(`The person's ${jointName.replace(/_/g, ' ')} is under strain.`);
            }
        }
        if (!anyBad) {
            desc.push('The person has good posture for working.');
        }
    }
    if (desc.length === 0) {
        return 'No person seen.';
    }
    return desc.join(' ');
}

// There is a chat tool with a conversation about tape. There is a person working in the space. This person's arms are under strain. There is a chat tool with a conversation about wrenches.
function getAreaInformation() {
    let frames = realityEditor.worldObjects.getBestWorldObject().frames;
    let tools = {};
    for (const frameId in frames) {
        const frame = frames[frameId];
        if (!tools[frame.src]) {
            tools[frame.src] = 0;
        }
        tools[frame.src] += 1;
    }
    let toolsText = Object.entries(tools).map(([toolSrc, count]) => {
        if (count === 1) {
            return `There is a ${toolSrc} tool.`;
        }
        return `There are ${count} ${toolSrc} tools.`;
    }).join(' ');

    let hpaText = getMotionStudyInformation();
    return toolsText + '\n' + hpaText;
}

export async function answerQuestion(question, toolCallMessages) {
    if (!apiKey) {
        throw new Error('Missing apiKey');
    }

    const messages = [{
        role: 'system',
        content: SYSTEM_PROMPT,
    }, {
        role: 'user',
        content: `Area information: """${getAreaInformation()}"""

Question: ${question}`,
    }];

    if (toolCallMessages) {
        messages.push(...toolCallMessages);
    }

    const body = {
        // model: 'gpt-4-vision-preview',
        model: 'gpt-4-turbo-preview',
        max_tokens: 2048,
        temperature: 0,
        messages,
        tools,
    };

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        const message = data.choices[0].message;
        let description = message.content;
        console.log('got openai', description, data);
        if (data.choices[0].finish_reason === 'tool_calls') {
            delete message.content;
            toolCallMessages = [message];
            toolCallMessages.push(...await doToolCalls(message.tool_calls));
            return await answerQuestion(question, toolCallMessages);
        } else {
            console.log('stop openai', description, data);
            return description;
        }
    } catch (error) {
        console.error('not openai', error);
    }
}
