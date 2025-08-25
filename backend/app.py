#NOT IN USE
import os
import re
import json
import logging
import difflib
import pandas as pd
import time
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Request, Body
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Any
# Import AWS services
from aws_services import dynamo_service
from fastapi import status
import google.auth
from google.auth.exceptions import DefaultCredentialsError

# ----------------------------
# Vertex AI Setup and Helpers
# ----------------------------

import vertexai
from vertexai.preview.generative_models import GenerativeModel, GenerationConfig

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PROJECT_ID = "striped-sight-443116-g6"
LOCATION = "us-central1"
VERTEX_AI_CREDENTIALS_FILE = "../src/striped-sight-443116-g6-a85ecf31e5a9.jso"

# Admin password for authentication
ADMIN_PASSWORD = "ATRIA"

# Scoring system constants
BASE_SCORE = 1000
TIME_PENALTY_PER_MINUTE = 10
WRONG_GUESS_PENALTY = 200
HINT_PENALTY = 100
BONUS_FOR_FAST_COMPLETION = 50  # Bonus for completing under 30 minutes

if not os.path.exists(VERTEX_AI_CREDENTIALS_FILE):
    logger.error(f"Vertex AI credentials file not found at {VERTEX_AI_CREDENTIALS_FILE}")
    raise FileNotFoundError(f"Vertex AI credentials file not found at {VERTEX_AI_CREDENTIALS_FILE}")

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = VERTEX_AI_CREDENTIALS_FILE

# Initialize Vertex AI
vertexai.init(project=PROJECT_ID, location=LOCATION)

def clean_json(json_string: str) -> str:
    """Clean JSON string by removing markdown formatting and trailing commas"""
    # Remove markdown code blocks
    json_string = re.sub(r'```json\s*', '', json_string)
    json_string = re.sub(r'```\s*$', '', json_string)
    
    # Remove trailing commas before closing brackets/braces
    json_string = re.sub(r',\s*(\]|\})', r'\1', json_string)
    
    # Remove any leading/trailing whitespace
    json_string = json_string.strip()
    
    return json_string

def get_vertex_response(prompt: str, json_response: bool = False, max_output_tokens: int = 256, temperature: float = 0.7) -> Any:
    model = GenerativeModel("gemini-2.0-flash-lite")
    config = GenerationConfig(
        temperature=temperature,
        max_output_tokens=max_output_tokens,
    )
    response = model.generate_content(prompt, generation_config=config)
    if json_response:
        try:
            cleaned_text = clean_json(response.text)
            return json.loads(cleaned_text)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON response: {response.text}")
            return {"error": "Failed to parse JSON", "raw_response": response.text}
    else:
        return response.text.strip()

# ----------------------------
# Scoring System Functions
# ----------------------------

def calculate_score(time_taken_seconds: int, wrong_guesses: int, hints_used: int, completed: bool) -> dict:
    """
    Calculate final score based on various parameters
    """
    if not completed:
        return {
            "score": 0,
            "time_taken": time_taken_seconds,
            "wrong_guesses": wrong_guesses,
            "hints_used": hints_used,
            "penalties": 0,
            "bonus": 0
        }
    
    # Start with base score
    score = BASE_SCORE
    
    # Calculate time penalty (penalty increases with time)
    time_minutes = time_taken_seconds / 60
    time_penalty = int(time_minutes * TIME_PENALTY_PER_MINUTE)
    
    # Calculate wrong guess penalty
    wrong_guess_penalty = wrong_guesses * WRONG_GUESS_PENALTY
    
    # Calculate hint penalty
    hint_penalty = hints_used * HINT_PENALTY
    
    # Calculate total penalties
    total_penalties = time_penalty + wrong_guess_penalty + hint_penalty
    
    # Apply penalties
    score -= total_penalties
    
    # Add bonus for fast completion (under 30 minutes)
    bonus = 0
    if time_minutes < 30:
        bonus = BONUS_FOR_FAST_COMPLETION
        score += bonus
    
    # Ensure score doesn't go below 0
    score = max(0, score)
    
    return {
        "score": score,
        "time_taken": time_taken_seconds,
        "wrong_guesses": wrong_guesses,
        "hints_used": hints_used,
        "penalties": total_penalties,
        "bonus": bonus
    }

def format_time(seconds: int) -> str:
    """Format seconds into HH:MM:SS"""
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    seconds = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

# ----------------------------
# Mysteries Story Dictionary
# ----------------------------

mysteries = {
    1: {
        "title": "The Gilded Rose Mansion - An Opulent Yet Hidden Deception",
        "murderer": "Jonathan Reed",
        "motive": [
            "Revenge for a past deception hidden within the mansion's walls",
            "Elimination of a rival threatening to expose a buried truth",
            "A desperate act to sever ties with a dangerous past",
            "A sacrifice to fulfill an ancient pact tied to the mansion",
            "A misguided attempt to claim power and control over the estate",
            "A secret lover's quarrel that turned deadly",
            "An attempt to erase a witness to a forbidden act",
            "A vendetta fueled by jealousy and ambition"
        ],
        "hints": [
            "Consider the relationships between the victim and those who felt overlooked or undervalued.",
            "Look for someone whose professional pride was wounded by the victim's decisions.",
            "The killer's motive stems from a deep sense of personal betrayal, not financial gain."
        ],
        "story": '''The Gilded Rose Mansion stands on a hill, its towering silhouette reaching towards the dusky sky as the evening settles in. The mansion is a relic of another era—an architectural masterpiece from the 19th century, showcasing grandiose classical design with ornate carvings, arched windows, and towering columns that seem to hold the weight of history. Its gilded accents glimmer faintly in the dimming light of dusk, making it a beacon in the distance, beckoning those who would visit. The garden surrounding the estate is a sprawling array of manicured hedges, fountains, and labyrinthine pathways, all bathed in the golden hue of the setting sun.

But beneath its beauty, the mansion hides an unsettling truth. This night, the mansion is no longer a symbol of elegance. It is a place where wealth, power, and long-held secrets converge in a deadly fashion. As a detective, you've been called here for a reason: to uncover what lies beneath the pristine surface of the Gilded Rose. A call, placed in the dead of night, has brought you to this estate—a call that would change everything.

The Journey to the Mansion
The ride to the mansion is long and winding, the path from the main road to the estate veering into the thickening woods. The faint sound of crickets chirps in the air, occasionally interrupted by the rustling of leaves as a gentle wind blows through the trees. The moon hangs low in the sky, casting its pale light onto the winding gravel road, illuminating your way.

Your car turns sharply, and suddenly, the mansion looms ahead of you. Its grandeur is almost overwhelming. The estate is alive with activity, yet a strange silence lingers in the air. The usual hum of music, the clinking of glasses, the laughter of guests—it is all gone. The heavy front gates, normally open to invite guests into the sprawling grounds, now stand ajar, creaking slightly in the wind.

As you step out of the car and approach the gates, a chill runs down your spine. Something is wrong. The scene before you feels heavy, suffused with an unnerving stillness.

The Interior of the Mansion
Stepping inside the mansion, the first thing you notice is the marble floors that stretch across the foyer, polished to a high shine. Crystal chandeliers hang from the ceiling, their prisms reflecting light across the grand space. The walls are adorned with expensive paintings—landscapes, portraits, and scenes from mythological tales—all framed in gold. The faint scent of roses lingers in the air, mingling with the aroma of wood polish and expensive perfume.

Yet despite its beauty, there's an undeniable tension in the atmosphere. You can feel it in the way the servants move—quick and silent, avoiding eye contact. You can hear it in the hushed whispers of the remaining guests, their faces drawn with fear and uncertainty.

The mansion is dimly lit, its once-vibrant halls now cloaked in shadows. The dim light from a few scattered lamps does little to mask the somber mood hanging over the place. The once-lively ballroom is now silent, its gleaming floors untouched. You can almost hear the echoes of the music that once filled the space—now replaced by an eerie quiet.

The Study: The Scene of the Crime
You are led down a long hallway toward the study—the room where the murder took place. As you approach, the door creaks open, revealing the grim scene inside. The room is large and opulent, with dark wood paneling that contrasts sharply with the heavy drapes hanging over the windows. A massive fireplace dominates one wall, its hearth cold and empty, though the air still carries the faint scent of burnt wood.

The desk, once meticulously organized, now lies in chaos. Papers are scattered across the surface, a glass of whiskey toppled over, its contents spilling onto a fine silk napkin. But it is the body of Charles Rayburn, the patriarch of the Rayburn family, that draws your attention. His lifeless form is slumped over the desk, his arms outstretched as if reaching for something in his final moments.

Charles Rayburn had been a man of power, his presence commanding respect from all who crossed his path. His dark suit, still perfectly tailored, and his crisp white shirt are now stained with his own blood. A letter opener, sharp and deadly, juts from his chest. The blood has already begun to dry, turning dark against the smooth wood of the desk.

You can't help but notice the stark contrast between the man and the room. The study itself, with its rich decor and expensive furnishings, feels cold now. The once warm and inviting space now stands as a silent witness to the crime. A nearby bookshelf holds volumes of classic literature and law books, their titles almost mocking the violence that has occurred here.

The Rayburn Family: Portraits of the Past and Present
The Rayburn family has been one of the city's most influential names for decades. The mansion itself is a testament to their wealth and legacy, but also to their secrets. Charles Rayburn, a business mogul, had built an empire. His sharp mind and ruthless drive had led him to success, but it also made him enemies along the way. His business dealings were always discreet, and his personal life was shrouded in mystery.

As you examine the scene, you begin to think about the family. Charles had three children: Lydia, his only daughter; Maxwell, his nephew; and Evelyn, his wife. Each of them had their own complicated relationships with Charles, and each had their own reasons to want him out of the way.

You are informed that the family members are scattered throughout the mansion, each in their own way processing the events that unfolded. They have been informed of the murder, but no one has yet been allowed to leave. It is your job to speak with them, to listen to their stories, and piece together the truth.

The Family Members: Faces of Deception and Desperation
Lydia Rayburn – The Daughter
Lydia Rayburn, Charles's only daughter, stands by the grand staircase, her posture stiff. Her long, auburn hair falls neatly to her shoulders, and her face is painted with a look of grief that doesn't quite reach her eyes. She is dressed in an elegant gown, but there is an edge to her—something calculating, even in the midst of her sorrow. She had always been the perfect daughter, the one who took care of business affairs and was poised in the public eye. But in recent months, rumors had begun to swirl about her growing dissatisfaction with her father's refusal to cede control of the family business.

"I didn't expect this… not like this," she says, her voice shaking slightly. Her eyes flicker to the ground. "We had disagreements, yes. But I never thought it would come to this."

Her words seem genuine, but something in her tone gives you pause. There's a bitterness in her expression, as though her father's death may have been inevitable—just a matter of time.

Maxwell Rayburn – The Nephew
Maxwell Rayburn, the young heir to the family business, is seated on a couch in the parlor, his head bowed. His youthful face is twisted with anger and frustration. Maxwell had always been eager to step into his uncle's shoes, but Charles had consistently overlooked him in favor of his own children. His attempts to prove himself had been met with rejection, and this had created a rift between the two men.

You approach Maxwell, and he lifts his gaze to meet yours. There is a sharpness to his eyes, a keen intelligence that hides behind the veil of his youthful exterior.

"I've been waiting for my chance," he admits, his voice strained. "But Charles was too proud to see my potential. He wouldn't let me take charge. It's always been Lydia's way or no way."

His words are filled with resentment, and you can sense that the tension between him and his late uncle was far more than just familial rivalry.

Evelyn Rayburn – The Wife
Evelyn Rayburn, the matriarch of the family, is in the garden. She stands beside a small fountain, the water cascading down in the otherwise quiet evening. Her beauty is still evident, despite her age. She carries herself with dignity, her every movement measured and graceful. But her eyes are red-rimmed, and her composure is fraying at the edges.

"I can't believe he's gone," she whispers, as if speaking to herself. "Charles… he was so stubborn. I warned him, I told him that his decisions were tearing the family apart."

There is something fragile about Evelyn's demeanor. Her grief is palpable, but there is also an undercurrent of something darker in her words. She hints at frustrations with her husband, but she doesn't elaborate.

Jonathan Reed – The Artist
Jonathan Reed, the artist, stands near the study door, his arms crossed tightly over his chest. His presence is commanding in a quiet way, his tousled hair and dark attire giving him an air of brooding intensity. He had been one of Charles Rayburn's closest confidantes in the art world, often commissioned to create pieces for the mansion. But his relationship with Charles had soured recently. The two men had fallen out over an unfinished project that Jonathan had poured his heart into. Jonathan had felt betrayed when Charles pulled funding for the project without warning.

"You can't imagine how it feels to give everything you have to a man, only to be thrown aside when things get tough," Jonathan says, his voice tight with emotion. "I didn't kill him, but I sure didn't like him by the end."

There's a palpable bitterness in his words, and you can tell that he still carries a lot of unresolved anger toward Charles. Could this be the motive?

The Investigation Begins
The investigation is just beginning, and you have only scratched the surface. The mansion is full of clues, hidden in plain sight, and the family members are all hiding something. Each has their own secrets, and each could be hiding the key to unlocking the truth.

The opulence of the Gilded Rose Mansion contrasts sharply with the darkness that now stains its halls. As you move through the rooms, you feel the weight of history pressing down on you. But in the silence of the study, the tension becomes unbearable. You can almost hear the echoes of the past, whispers of betrayal and deceit, each corner of the mansion hiding its own secrets.

The story has only just begun, Detective. The truth is out there, waiting to be uncovered.'''
    },
    2: {
        "title": "The Hollowbrook Asylum: A Descent into Darkness",
        "murderer": "Daniel Mercer",
        "motive": [
            "Vengeance for a betrayal long forgotten",
            "Protection of a dark secret hidden beneath the city",
            "A prophecy fulfilled through bloodshed",
            "Elimination of a dangerous threat to the kingdom's balance",
            "Desperation to escape a doomed fate",
            "An oath to an unseen force demanding sacrifice",
            "A desire to dismantle the corruption of Ebonmere",
            "A personal vendetta masked as divine justice"
        ],
        "hints": [
            "Pay attention to those who observed the victim's methods with particular scrutiny.",
            "The killer is someone who saw through the victim's facade and was deeply affected by what they discovered.",
            "This murder was driven by a personal vendetta, not institutional corruption."
        ],
        "story": '''The Hollowbrook Asylum, once a beacon of hope for those lost in the labyrinth of their own minds, now stands as a decaying relic of forgotten promises. The hospital, a vast gothic structure looming against the night sky, is drenched in an eerie silence that seems to breathe with the shifting wind. Its arched windows stare blankly into the darkness, their glass panes smudged with time, reflecting the silver gleam of the full moon above.

As you step onto the cracked stone pathway leading to the asylum's entrance, a sudden gust of wind rustles the skeletal branches of the gnarled trees lining the property. The wrought-iron gate behind you slams shut with a resonating clang, as if sealing your fate. The air is thick with the scent of damp earth, disinfectant, and something else—something metallic, something unsettlingly familiar.

You were summoned here by an urgent call, a distressed voice on the other end of the line whispering through the static. "Detective... there's been a murder at Hollowbrook. Dr. Thorne is dead. And I think someone is watching me."

The heavy double doors groan as you push them open, revealing the dimly lit reception area. A flickering overhead light casts jagged shadows along the walls, distorting the faded wallpaper and peeling paint. The faint hum of distant machinery echoes through the empty halls, a reminder that life persists within these walls despite the looming presence of death.

The Victim: Dr. Elias Thorne

Dr. Elias Thorne was the chief psychiatrist of Hollowbrook Asylum. A man of sharp intellect and colder disposition, he was both revered and feared among his colleagues and patients. He was known for his unorthodox methods—his belief that the mind could be forced to heal through extreme measures. Electroconvulsive therapy, sensory deprivation, forced regression—techniques others had long since abandoned. Some whispered that he crossed the line between healer and tormentor.

His body was found in his office, seated in his grand mahogany chair, his head slumped forward as though in deep contemplation. But the pool of blood staining his pristine white coat told a different story. A single, clean stab wound to the heart. No signs of a struggle, no evidence of forced entry.

His office is as imposing as the man once was. Dark wooden shelves line the walls, filled with thick medical tomes and case files. A record player sits on his desk, the needle still resting on the vinyl, as if it had been playing when death arrived. A faint scent of cigar smoke lingers in the air, mixing with the iron tang of blood. A shattered coffee mug lies near his feet, its contents seeping into the intricate Persian rug beneath him.

A half-written letter sits on his desk, addressed to no one.

"I fear I have made a mistake. I should not have pursued—"

The ink trails off, a deep scratch in the paper where the pen had pressed too hard before slipping from his grasp.

The Suspects: The Living Shadows of Hollowbrook

Hollowbrook Asylum is filled with those who had reason to despise Dr. Thorne. Patients, staff, even visitors—each carrying their own burdens, their own secrets. And one among them has blood on their hands.

Dr. Vivian Hale – The Protégé

Dr. Hale stands in the observation room, her sharp eyes scanning the halls with barely concealed nervousness. She had worked closely with Dr. Thorne for years, absorbing his methods, his mannerisms, his philosophies. But cracks had begun to show. Whispers in the halls suggested a schism between mentor and student, a growing unease over his practices.

"He was brilliant," she says, her voice measured, controlled. "But he had become reckless. I warned him. I told him he was pushing too far. But he wouldn't listen."

There's something hidden beneath her carefully composed facade—resentment? Fear? Or something darker?

Daniel Mercer – The Patient

A former journalist, Daniel Mercer had checked himself into Hollowbrook after a psychotic break, one that left his credibility shattered and his mind fraying at the edges. He had always been an inquisitive man, and that trait hadn't faded with his diagnosis. He had taken a particular interest in Dr. Thorne's experiments, collecting notes, observations—secrets.

"You think I killed him?" he laughs, but there's no humor in it. "Dr. Thorne had plenty of enemies. I was just one of the few who saw him for what he really was. Do you know what happens when you peel back the layers of a man like that? You find a monster beneath."

His hands tremble as he speaks, his gaze darting to the corners of the room, as though he expects someone—something—to emerge from the shadows.

Eleanor Bishop – The Nurse

Eleanor Bishop had been at Hollowbrook longer than most. A dedicated nurse, devoted to the patients—but her loyalty to Dr. Thorne was less clear. She had often been seen arguing with him, her voice rising in frustration, only to fall silent when his icy stare met hers.

"Dr. Thorne thought he knew best," she murmurs, her hands wringing the hem of her uniform. "He thought he could play god. But he didn't understand... some things shouldn't be meddled with. Some doors, once opened, can never be closed."

Her gaze lingers on the floor, her expression haunted. "I heard something that night. A sound I'll never forget. It wasn't human."

Lawrence Thorne – The Brother

Lawrence, Elias Thorne's estranged younger brother, had arrived at Hollowbrook unannounced the night of the murder. The two had not spoken in years. Lawrence had always resented Elias's cold ambition, his ability to cast aside sentiment in the name of progress.

"I came to confront him," he admits, running a hand through his unkempt hair. "To make him face the past. But when I arrived, he was already dead."

A convenient alibi, or the truth? His grief seems genuine, but there's an underlying anger, an old wound reopened.

The Clues and the Shadows They Cast

As you begin your investigation, the hospital itself feels like a living entity, breathing in the secrets of those who walk its halls. You find a hidden compartment in Dr. Thorne's desk, containing a key with no known lock. His medical records indicate a patient admitted under a false name—someone erased from the system. A bloodstained glove, found discarded in the laundry chute. And a torn page from a patient's journal, with a single line scrawled across it:

"He promised I would forget. But I remember everything."

The walls of Hollowbrook whisper their truths in hushed tones, urging you forward. The deeper you dig, the more the shadows seem to shift. The truth is here, hidden beneath layers of lies, waiting to be unearthed.'''
    },
    3: {
        "title": "The Veil of Ebonmere",
        "murderer": "Lady Seraphine Voss",
        "motive": [
            "Vengeance for a betrayal long forgotten",
            "Protection of a dark secret hidden beneath the city",
            "A prophecy fulfilled through bloodshed",
            "Elimination of a dangerous threat to the kingdom's balance",
            "Desperation to escape a doomed fate",
            "An oath to an unseen force demanding sacrifice",
            "A desire to dismantle the corruption of Ebonmere",
            "A personal vendetta masked as divine justice"
        ],
        "hints": [
            "Consider who among the suspects had the most intimate knowledge of the victim's fears and secrets.",
            "The killer is someone whose own destiny was intertwined with the victim's in ways that became unbearable.",
            "This murder was committed to protect something far greater than personal ambition."
        ],
        "story": '''The Setting: Ebonmere, the Shrouded Realm

Beneath twin moons, cradled by mountains of obsidian and forests of silver-tinged trees, lies the city of Ebonmere—a realm where magic and whispers intertwine. The air shimmers with an unnatural stillness, the rivers hum in an eerie cadence, and the great spires of the citadel pierce the misted heavens like jagged fangs.

Ebonmere is a place where time drifts like smoke. Its streets are paved with luminescent stones, glowing faintly beneath the violet sky. Enchanted lanterns float in clusters, casting shadows that move even when no one does. The city's denizens—artisans of alchemy, scholars of the arcane, and rulers bound by prophecy—know the price of knowledge. And within the heart of the citadel, the price has been paid in blood.

The Crime: The Death of High Magister Aldren Thalor

The wind carries the scent of crushed sage and burnt embers as you step into the Grand Hall of Arcana. A vast chamber of soaring arches and cascading drapes of celestial silk, it was once a sanctuary of wisdom. Now, it is a tomb.

High Magister Aldren Thalor, the master of the Order of Arcana, lies slumped over his ceremonial table. His ornate robes, woven with threads of starfire, are darkened with an ominous stain. His right hand, twisted at an unnatural angle, clutches an obsidian dagger with veins of glowing emerald. His eyes—once orbs of insight—are now vacant, pupils dilated as though staring into something unspeakable.

There is no sign of forced entry, no shattered vials of poison, and no lingering scent of battle. The wards guarding the hall remain untouched, their sigils pulsing with arcane power. The murder, impossibly, happened within a room meant to be impenetrable.

A single phrase is carved into the wood of the table before him, written in a language thought to be lost to time:

"The veil is thinning. He saw too much."

The Suspects: Shadows Among the Veil

Lady Seraphine Voss – The Seer

Lady Seraphine Voss, the court seer, stands by the great windows, her silver hair catching the moonlight like spun silk. Her eyes, pools of liquid mercury, seem to see beyond the physical realm. She had been Aldren's closest confidante, sharing his visions of the future, his fears of the encroaching darkness.

"The veil between worlds grows thin," she whispers, her voice carrying the weight of prophecy. "Aldren saw what was coming. He tried to warn us, but some truths are too terrible to bear."

There's a haunted quality to her words, as though she too has glimpsed the horrors that drove Aldren to his death.

Lord Marcus Blackwood – The Alchemist

Lord Marcus Blackwood, master of the arcane arts, paces the chamber with restless energy. His hands, stained with the residue of countless experiments, clench and unclench at his sides. He and Aldren had been rivals for years, competing for the favor of the council, for control of the ancient knowledge locked within the citadel's vaults.

"Aldren was a fool," he spits, his voice sharp with bitterness. "He thought he could control forces beyond mortal comprehension. The old magic is not meant to be wielded by human hands."

His words carry the weight of personal grievance, but there's something else beneath the surface—fear, perhaps, or desperation.

Captain Isolde Frost – The Guardian

Captain Isolde Frost, commander of the citadel's guard, stands at attention by the door, her silver armor gleaming in the dim light. Her face is a mask of duty, but her eyes betray the turmoil within. She had been responsible for the security of the Grand Hall, and the murder represents a failure of her sacred duty.

"I failed him," she admits, her voice barely above a whisper. "The wards should have protected him. They should have kept him safe."

Her guilt is palpable, but is it the guilt of failure, or something more sinister?

The Investigation Begins

As you begin your investigation, the citadel itself seems to breathe with ancient power. The very air crackles with arcane energy, and the shadows cast by the floating lanterns seem to move with purpose. You find traces of forbidden magic, scrolls written in languages long forgotten, and evidence of rituals that should never have been performed.

The truth lies hidden within the veils of magic and deception, waiting to be uncovered by those brave enough to face the darkness that lurks beneath the surface of Ebonmere.'''
    }
};

# ----------------------------
# FastAPI App Setup & Models
# ----------------------------

app = FastAPI(title="Murder Mystery Game API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TeamRegistration(BaseModel):
    team_name: str
    password: str

class TeamLogin(BaseModel):
    team_name: str
    password: str

class GameSession(BaseModel):
    team_name: str
    mystery_id: int
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    time_taken_seconds: Optional[int] = 0
    wrong_guesses: int = 0
    hints_used: int = 0
    completed: bool = False
    score: Optional[int] = 0
    penalties: Optional[int] = 0
    bonus: Optional[int] = 0

class GameStats(BaseModel):
    team_name: str
    mystery_id: int
    time_taken: int
    wrong_guesses: int = 0
    hints_used: int = 0
    completed: bool = True

class PlayerStart(BaseModel):
    team_name: str
    mystery_id: int

class HintRequest(BaseModel):
    question: str
    mystery_id: int
    team_name: str

class ValidateMotiveRequest(BaseModel):
    input_motive: str
    valid_motives: List[str]
    team_name: str
    mystery_id: int

class WrongGuessRequest(BaseModel):
    team_name: str
    mystery_id: int
    guess_type: str  # "murderer" or "motive"

class GameStatus(BaseModel):
    team_name: str
    mystery_id: int

class ValidateGuessRequest(BaseModel):
    team_name: str
    mystery_id: int
    murderer_guess: str
    motive_guess: str

@app.middleware("http")
async def log_requests(request: Request, call_next):
    try:
        logger.info("\n📥 Incoming Request:")
        logger.info(f"➡️  Method: {request.method}")
        logger.info(f"📍 Path: {request.url.path}")
        logger.info("📥 About to call next middleware...")
        response = await call_next(request)
        logger.info(f"📥 Response status: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"❌ Error in request middleware: {e}")
        raise e

# ----------------------------
# Authentication Endpoints
# ----------------------------

@app.post("/register")
async def register_team(data: TeamRegistration):
    """Register a new team"""
    logger.info(f"🔐 Registration attempt for team: {data.team_name}")
    logger.info(f"🔐 Password received: {data.password}")
    logger.info(f"🔐 Admin password expected: {ADMIN_PASSWORD}")
    
    try:
        logger.info("🔐 Starting password validation...")
        if data.password != ADMIN_PASSWORD:
            logger.warning(f"❌ Invalid admin password for team: {data.team_name}")
            raise HTTPException(status_code=403, detail="Invalid admin password")
        
        logger.info(f"✅ Admin password validated for team: {data.team_name}")
        logger.info("🔐 Calling dynamo_service.register_team...")
        success = dynamo_service.register_team(data.team_name, data.password)
        logger.info(f"🔐 dynamo_service.register_team returned: {success}")
        
        if success:
            logger.info(f"✅ Team '{data.team_name}' registered successfully")
            return JSONResponse(content={"message": f"Team '{data.team_name}' registered successfully"})
        else:
            logger.warning(f"❌ Team '{data.team_name}' already exists")
            raise HTTPException(status_code=400, detail="Team name already exists")
            
    except HTTPException:
        # Re-raise HTTPExceptions without modification
        raise
    except Exception as e:
        logger.error(f"❌ Error in registration for team '{data.team_name}': {e}")
        raise HTTPException(status_code=500, detail="Registration failed due to server error. Please try again.")

@app.post("/login")
async def login_team(request: Request):
    try:
        logger.info("🔑 Login endpoint called")
        logger.info("🔑 About to parse JSON body...")
        body = await request.json()
        logger.info(f"🔑 Login body received: {body}")
        
        logger.info("🔑 Extracting team_name and password...")
        team_name = body.get('team_name')
        password = body.get('password')
        logger.info(f"🔑 Extracted - team_name: {team_name}, password: {password}")
        
        if not team_name or not password:
            logger.warning("❌ Missing team_name or password")
            raise HTTPException(status_code=400, detail="Missing team_name or password")
        
        logger.info(f"🔑 Login attempt for team: {team_name}")
        
        logger.info("🔑 About to check if team exists...")
        try:
            team_exists = dynamo_service.check_team_exists(team_name)
        except Exception as e:
            logger.error(f"❌ Error checking team existence: {e}")
            raise HTTPException(status_code=500, detail="Could not check team registration status. Please try again later.")
        logger.info(f"🔍 Team '{team_name}' exists: {team_exists}")
        
        if not team_exists:
            logger.warning(f"❌ Team '{team_name}' not found")
            raise HTTPException(status_code=404, detail="Team not found. Please register first.")
        
        logger.info("🔑 About to validate password...")
        password_valid = dynamo_service.validate_team(team_name, password)
        logger.info(f"🔐 Password validation for '{team_name}': {password_valid}")
        
        if password_valid:
            logger.info(f"✅ Login successful for team: {team_name}")
            return JSONResponse(content={"message": f"Welcome back, {team_name}!"})
        else:
            logger.warning(f"❌ Invalid password for team: {team_name}")
            raise HTTPException(status_code=401, detail="Invalid password for this team")
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error in login: {e}")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

# ----------------------------
# Game Endpoints
# ----------------------------

@app.post("/start_game")
async def start_game(data: PlayerStart):
    """Start a new game session with persistent timer tracking"""
    try:
        # Check if team exists
        team_exists = dynamo_service.check_team_exists(data.team_name)
        if not team_exists:
            raise HTTPException(status_code=404, detail="Team not found")
        
        # Check if mystery exists
        if data.mystery_id not in mysteries:
            raise HTTPException(status_code=404, detail="Mystery not found")
        
        # Create game session
        session_id = f"{data.team_name}_{data.mystery_id}"
        start_time = datetime.utcnow()
        logger.info(f"[DEBUG] Creating session {session_id} with start_time: {start_time.isoformat()} (UTC now: {datetime.utcnow().isoformat()})")
        
        game_session = {
            "session_id": session_id,
            "team_name": data.team_name,
            "mystery_id": data.mystery_id,
            "start_time": start_time.isoformat(),
            "end_time": None,
            "time_taken_seconds": 0,
            "wrong_guesses": 0,
            "hints_used": 0,
            "completed": False,
            "score": 0,
            "penalties": 0,
            "bonus": 0,
            "created_at": start_time.isoformat(),
            "updated_at": start_time.isoformat()
        }
        
        # Save to DynamoDB
        await dynamo_service.save_game_session(game_session)
        
        logger.info(f"✅ Game session started: {session_id}")
        
        return {
            "success": True,
            "session_id": session_id,
            "start_time": start_time.isoformat(),
            "mystery": {
                "id": data.mystery_id,
                "title": mysteries[data.mystery_id]["title"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error starting game: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to start game")

@app.get("/game_status/{team_name}/{mystery_id}")
async def get_game_status(team_name: str, mystery_id: int):
    """Get current game status and elapsed time"""
    try:
        session_id = f"{team_name}_{mystery_id}"
        session = await dynamo_service.get_game_session(session_id)
        
        if not session:
            raise HTTPException(status_code=404, detail="Game session not found")
        
        # Calculate elapsed time
        start_time = datetime.fromisoformat(session["start_time"])
        current_time = datetime.utcnow()
        elapsed_seconds = int((current_time - start_time).total_seconds())
        
        return {
            "session_id": session_id,
            "team_name": team_name,
            "mystery_id": mystery_id,
            "start_time": session["start_time"],
            "elapsed_seconds": elapsed_seconds,
            "elapsed_formatted": format_time(elapsed_seconds),
            "wrong_guesses": int(session.get("wrong_guesses", 0)),
            "hints_used": int(session.get("hints_used", 0)),
            "completed": session.get("completed", False)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting game status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get game status")

@app.post("/record_wrong_guess")
async def record_wrong_guess(data: WrongGuessRequest):
    """Record a wrong guess and apply penalty"""
    try:
        session_id = f"{data.team_name}_{data.mystery_id}"
        session = await dynamo_service.get_game_session(session_id)
        
        if not session:
            raise HTTPException(status_code=404, detail="Game session not found")
        
        # Increment wrong guesses
        current_wrong_guesses = int(session.get("wrong_guesses", 0)) + 1
        
        # Update session
        update_data = {
            "wrong_guesses": current_wrong_guesses,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        await dynamo_service.update_game_session(session_id, update_data)
        
        logger.info(f"✅ Wrong guess recorded for {session_id}: {data.guess_type}")
        
        return {
            "success": True,
            "wrong_guesses": current_wrong_guesses,
            "penalty_applied": WRONG_GUESS_PENALTY
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error recording wrong guess: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to record wrong guess")

@app.post("/complete_game")
async def complete_game(data: GameStats):
    """Complete a game and calculate final score"""
    try:
        session_id = f"{data.team_name}_{data.mystery_id}"
        session = await dynamo_service.get_game_session(session_id)
        
        if not session:
            raise HTTPException(status_code=404, detail="Game session not found")
        
        if session.get("completed", False):
            raise HTTPException(status_code=400, detail="Game already completed")
        
        # Calculate final score
        score_data = calculate_score(
            time_taken_seconds=data.time_taken,
            wrong_guesses=data.wrong_guesses,
            hints_used=data.hints_used,
            completed=data.completed
        )
        
        # Update session with completion data
        end_time = datetime.utcnow()
        update_data = {
            "end_time": end_time.isoformat(),
            "time_taken_seconds": data.time_taken,
            "wrong_guesses": data.wrong_guesses,
            "hints_used": data.hints_used,
            "completed": data.completed,
            "score": score_data["score"],
            "penalties": score_data["penalties"],
            "bonus": score_data["bonus"],
            "updated_at": end_time.isoformat()
        }
        
        await dynamo_service.update_game_session(session_id, update_data)
        
        # Save to leaderboard
        leaderboard_entry = {
            "team_name": data.team_name,
            "mystery_id": data.mystery_id,
            "score": score_data["score"],
            "time_taken": data.time_taken,
            "time_formatted": format_time(data.time_taken),
            "wrong_guesses": data.wrong_guesses,
            "hints_used": data.hints_used,
            "penalties": score_data["penalties"],
            "bonus": score_data["bonus"],
            "completed_at": end_time.isoformat(),
            "created_at": end_time.isoformat()
        }
        
        await dynamo_service.save_leaderboard_entry(leaderboard_entry)
        
        logger.info(f"✅ Game completed: {session_id} with score {score_data['score']}")
        
        return {
            "success": True,
            "score": score_data["score"],
            "time_taken": data.time_taken,
            "time_formatted": format_time(data.time_taken),
            "wrong_guesses": data.wrong_guesses,
            "hints_used": data.hints_used,
            "penalties": score_data["penalties"],
            "bonus": score_data["bonus"],
            "completed": data.completed
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error completing game: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to complete game")

# ----------------------------
# Leaderboard Endpoints
# ----------------------------

@app.get("/check_completion_status/{team_name}")
async def check_completion_status(team_name: str):
    """Check if a team has completed all three mysteries"""
    try:
        # Check if team exists
        team_exists = dynamo_service.check_team_exists(team_name)
        if not team_exists:
            raise HTTPException(status_code=404, detail="Team not found")
        
        # Get all completed game sessions for this team
        completed_mysteries = []
        for mystery_id in [1, 2, 3]:
            session_id = f"{team_name}_{mystery_id}"
            session = await dynamo_service.get_game_session(session_id)
            if session and session.get("completed", False):
                completed_mysteries.append(mystery_id)
        
        has_completed_all = len(completed_mysteries) >= 3
        
        return {
            "team_name": team_name,
            "completed_mysteries": completed_mysteries,
            "total_completed": len(completed_mysteries),
            "has_completed_all": has_completed_all,
            "required_mysteries": 3
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error checking completion status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to check completion status")

@app.get("/leaderboard")
async def get_leaderboard(limit: int = 50):
    """Get top players from leaderboard"""
    leaderboard = dynamo_service.get_leaderboard(limit)
    return {"leaderboard": leaderboard}

@app.get("/team_stats/{team_name}")
async def get_team_stats(team_name: str):
    """Get statistics for a specific team"""
    stats = dynamo_service.get_team_stats(team_name)
    return stats

# ----------------------------
# Utility Endpoints
# ----------------------------

@app.get("/mysteries")
async def get_mysteries():
    """Get list of available mysteries"""
    return {"mysteries": list(mysteries.keys())}

@app.get("/mystery/{mystery_id}")
async def get_mystery(mystery_id: int):
    """Get specific mystery details"""
    mystery = mysteries.get(mystery_id)
    if not mystery:
        raise HTTPException(status_code=404, detail="Mystery not found")
    return mystery

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "2.0.0"}

# ----------------------------
# Initialize DynamoDB Tables
# ----------------------------

@app.on_event("startup")
async def startup_event():
    """Initialize DynamoDB tables and verify Google Vertex AI credentials on startup"""
    try:
        # DynamoDB tables
        dynamo_service.create_tables()
        logger.info("DynamoDB tables initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize DynamoDB tables: {e}")

    # --- Vertex AI Credentials Check ---
    try:
        cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if not cred_path or not os.path.exists(cred_path):
            logger.error(f"Vertex AI credentials file not found at {cred_path}")
        else:
            logger.info(f"Vertex AI credentials file found at {cred_path}")
            try:
                credentials, project = google.auth.load_credentials_from_file(cred_path)
                logger.info(f"Google credentials loaded for project: {project}")
            except DefaultCredentialsError as gce:
                logger.error(f"Failed to load Google credentials: {gce}")
            # Try a simple Vertex AI call
            try:
                from vertexai.preview.generative_models import GenerativeModel
                model = GenerativeModel("gemini-2.0-flash-lite")
                # Try a dry run/test call (list models or a simple prompt)
                test_response = model.generate_content("Say hello", generation_config=None)
                logger.info(f"Vertex AI test call succeeded: {test_response.text[:60]}")
            except Exception as ve:
                logger.error(f"Vertex AI test call failed: {ve}")
    except Exception as e:
        logger.error(f"Vertex AI credentials check failed: {e}")

# ----------------------------
# Run the Application
# ----------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Internal server error: {str(exc)}"},
    )

@app.post("/get_hint")
async def get_hint(request_data: HintRequest):
    """Get a hardcoded hint for the current mystery and track usage"""
    try:
        logger.info(f"🤖 Hint request for mystery {request_data.mystery_id}")
        logger.info(f"🤖 Question: {request_data.question}")
        
        # Track hint usage in game session
        session_id = f"{request_data.team_name}_{request_data.mystery_id}"
        session = await dynamo_service.get_game_session(session_id)
        
        current_hints = 0
        if session:
            current_hints = int(session.get("hints_used", 0))
        
        # Get mystery details
        mystery = mysteries.get(request_data.mystery_id)
        if not mystery:
            raise HTTPException(status_code=404, detail="Mystery not found")
        
        hints = mystery.get("hints", [])
        if current_hints < len(hints):
            hint = hints[int(current_hints)]
            # Increment hint count
            current_hints += 1
            if session:
                update_data = {
                    "hints_used": current_hints,
                    "updated_at": datetime.utcnow().isoformat()
                }
                await dynamo_service.update_game_session(session_id, update_data)
                logger.info(f"✅ Hint usage tracked: {current_hints} hints used")
        else:
            hint = "No more hints available for this mystery. Trust your detective instincts!"
        
        logger.info(f"✅ Hardcoded hint returned for mystery {request_data.mystery_id}")
        
        return {
            "hint": hint,
            "hints_used": current_hints,
            "penalty_applied": HINT_PENALTY
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting hint: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get hint")

@app.post("/validate_motive")
async def validate_motive(request_data: ValidateMotiveRequest):
    """Validate motive and track wrong guesses"""
    try:
        logger.info(f"🔍 Motive validation for mystery {request_data.mystery_id}")
        logger.info(f"🔍 Input motive: {request_data.input_motive}")
        logger.info(f"🔍 Valid motives: {request_data.valid_motives}")
        
        # Use the new AI-based validation
        motive_validation = await validate_motive_internal(
            request_data.input_motive, 
            request_data.valid_motives, 
            request_data.team_name, 
            request_data.mystery_id
        )
        
        # Track wrong guess if incorrect
        current_wrong_guesses = 0
        if not motive_validation["correct"]:
            session_id = f"{request_data.team_name}_{request_data.mystery_id}"
            session = await dynamo_service.get_game_session(session_id)
            
            if session:
                current_wrong_guesses = int(session.get("wrong_guesses", 0)) + 1
                update_data = {
                    "wrong_guesses": current_wrong_guesses,
                    "updated_at": datetime.utcnow().isoformat()
                }
                await dynamo_service.update_game_session(session_id, update_data)
                logger.info(f"✅ Wrong motive guess tracked: {current_wrong_guesses} wrong guesses")
        
        logger.info(f"✅ Motive validation result: {motive_validation['correct']}")
        
        return {
            "correct": motive_validation["correct"],
            "best_match": motive_validation["best_match"],
            "similarity_ratio": motive_validation["similarity_ratio"],
            "feedback": motive_validation["feedback"],
            "wrong_guesses": current_wrong_guesses,
            "penalty_applied": WRONG_GUESS_PENALTY if not motive_validation["correct"] else 0
        }
        
    except Exception as e:
        logger.error(f"❌ Error validating motive: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to validate motive")

def get_escalating_hint(mystery_id, wrong_guesses, type_):
    # Simple, clear escalating hints for murderer/motive
    # You can customize these per mystery if desired
    base_hints = {
        'murderer': [
            "Pay attention to who had the most to lose.",
            "Look for someone with a personal grudge.",
            "Focus on the victim's closest relationships.",
            "The answer is among those who were at the scene the longest."
        ],
        'motive': [
            "Think about jealousy or revenge.",
            "The motive is not about money.",
            "It's a personal reason, not a professional one.",
            "The motive is rooted in the past, not just the present."
        ]
    }
    hints = base_hints[type_]
    idx = min(wrong_guesses - 3, len(hints) - 1)
    return hints[idx]

@app.post("/validate_guess")
async def validate_guess(request_data: ValidateGuessRequest):
    """Validate both murderer and motive with detailed feedback and escalating hints"""
    try:
        logger.info(f"🔍 Comprehensive guess validation for mystery {request_data.mystery_id}")
        logger.info(f"🔍 Murderer guess: {request_data.murderer_guess}")
        logger.info(f"🔍 Motive guess: {request_data.motive_guess}")
        
        # Get mystery details
        mystery = mysteries.get(request_data.mystery_id)
        if not mystery:
            raise HTTPException(status_code=404, detail="Mystery not found")
        
        correct_murderer = mystery["murderer"]
        valid_motives = mystery["motive"]
        
        # Validate murderer with AI assistance for flexibility
        murderer_validation = await validate_murderer_with_ai(
            request_data.murderer_guess, 
            correct_murderer, 
            mystery
        )
        
        # Validate motive using existing logic
        motive_validation = await validate_motive_internal(
            request_data.motive_guess, 
            valid_motives, 
            request_data.team_name, 
            request_data.mystery_id
        )
        
        # Determine overall result
        is_correct = murderer_validation["correct"] and motive_validation["correct"]
        
        # Track wrong guesses if incorrect
        current_wrong_guesses = 0
        if not is_correct:
            session_id = f"{request_data.team_name}_{request_data.mystery_id}"
            session = await dynamo_service.get_game_session(session_id)
            if session:
                current_wrong_guesses = int(session.get("wrong_guesses", 0)) + 1
                update_data = {
                    "wrong_guesses": current_wrong_guesses,
                    "updated_at": datetime.utcnow().isoformat()
                }
                await dynamo_service.update_game_session(session_id, update_data)
                logger.info(f"✅ Wrong guess tracked: {current_wrong_guesses} wrong guesses")
        else:
            # Reset wrong guesses on correct answer
            session_id = f"{request_data.team_name}_{request_data.mystery_id}"
            session = await dynamo_service.get_game_session(session_id)
            if session:
                update_data = {
                    "wrong_guesses": 0,
                    "updated_at": datetime.utcnow().isoformat()
                }
                await dynamo_service.update_game_session(session_id, update_data)
        
        # Escalating feedback logic
        feedback = ""
        if not is_correct and current_wrong_guesses >= 3:
            if not murderer_validation["correct"]:
                feedback = get_escalating_hint(request_data.mystery_id, current_wrong_guesses, 'murderer')
            elif not motive_validation["correct"]:
                feedback = get_escalating_hint(request_data.mystery_id, current_wrong_guesses, 'motive')
        else:
            feedback = generate_validation_feedback(
                murderer_validation, 
                motive_validation, 
                correct_murderer
            )
        
        logger.info(f"✅ Validation result: {is_correct}")
        
        return {
            "correct": is_correct,
            "murderer_correct": murderer_validation["correct"],
            "motive_correct": motive_validation["correct"],
            "feedback": feedback,
            "wrong_guesses": current_wrong_guesses,
            "penalty_applied": WRONG_GUESS_PENALTY if not is_correct else 0
        }
    except Exception as e:
        logger.error(f"❌ Error validating guess: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to validate guess")

async def validate_murderer_with_ai(guess: str, correct_murderer: str, mystery: dict) -> dict:
    """Validate murderer guess using AI for flexible matching"""
    try:
        # Clean and normalize inputs
        guess_clean = guess.strip().lower()
        correct_clean = correct_murderer.strip().lower()
        
        # First try exact match (case insensitive)
        if guess_clean == correct_clean:
            return {
                "correct": True,
                "confidence": 1.0,
                "feedback": "Perfect match!"
            }
        
        # Try first name only match
        guess_first_name = guess_clean.split()[0] if " " in guess_clean else guess_clean
        correct_first_name = correct_clean.split()[0] if " " in correct_clean else correct_clean
        
        if guess_first_name == correct_first_name:
            return {
                "correct": True,
                "confidence": 0.9,
                "feedback": "Good! You got the right person."
            }
        
        # Use AI for more flexible validation
        prompt = f"""
        You are validating a murderer guess in a murder mystery game.
        
        Mystery: {mystery['title']}
        Correct murderer: {correct_murderer}
        Player's guess: {guess}
        
        Determine if the player's guess refers to the correct murderer. Consider:
        1. Nicknames or variations of the name
        2. Partial names (first name only, last name only)
        3. Common misspellings
        4. Titles or honorifics (Mr., Dr., Lady, etc.)
        
        IMPORTANT: If the guess is incorrect, DO NOT reveal or reference the correct murderer's name or any part of it. Only say that the guess is incorrect and encourage the player to try again. Never give away the correct answer, even partially.
        
        Respond with ONLY a JSON object:
        {{
            "correct": true/false,
            "confidence": 0.0-1.0,
            "reason": "brief explanation (never reveal the correct name if incorrect)"
        }}
        """
        
        response = get_vertex_response(prompt, json_response=True, max_output_tokens=256, temperature=0.1)
        
        if isinstance(response, dict) and "correct" in response:
            return {
                "correct": response["correct"],
                "confidence": response.get("confidence", 0.5),
                "feedback": response.get("reason", "AI validation inconclusive")
            }
        
        # Fallback to fuzzy matching if AI fails
        import difflib
        similarity = difflib.SequenceMatcher(None, guess_clean, correct_clean).ratio()
        
        if similarity >= 0.8:
            return {
                "correct": True,
                "confidence": similarity,
                "feedback": "Close enough! You got the right person."
            }
        
        return {
            "correct": False,
            "confidence": similarity,
            "feedback": "That's not the right person. Keep investigating!"
        }
    except Exception as e:
        logger.error(f"Error in AI murderer validation: {e}")
        # Fallback to simple comparison
        return {
            "correct": guess.strip().lower() == correct_murderer.strip().lower(),
            "confidence": 0.5,
            "feedback": "Validation error occurred"
        }

async def validate_motive_internal(input_motive: str, valid_motives: list, team_name: str, mystery_id: int) -> dict:
    """Internal motive validation using AI for better accuracy (no fuzzy matching, strict AI)"""
    try:
        input_lower = input_motive.lower().strip()
        valid_lower = [motive.lower().strip() for motive in valid_motives]
        
        # First try exact match (case insensitive)
        if input_lower in valid_lower:
            return {
                "correct": True,
                "best_match": input_lower,
                "similarity_ratio": 1.0,
                "feedback": "Correct motive!"
            }
        
        # Use AI for strict validation
        prompt = f"""
        You are validating a motive guess in a murder mystery game.
        
        The player has provided this motive: "{input_motive}"
        
        The valid motives for this mystery are provided, but you must NEVER list, enumerate, or directly describe them in your response. Do NOT reveal or hint at the actual motives. Only accept answers that match the core intent and meaning of the valid motives, not just any plausible or related motive. If the player's motive is incorrect, only provide a vague, thematic nudge (such as 'Consider emotional or personal reasons behind the crime.' or 'Think about hidden resentments or relationships.')—never mention any specific motive or concept.
        
        Be strict: Only accept answers that truly capture the same fundamental reason for the murder as the valid motives, even if expressed differently. Do not accept broad or generic motives if they do not match the core intent.
        
        Respond with ONLY a JSON object:
        {{
            "correct": true/false,
            "confidence": 0.0-1.0,
            "best_match": null,
            "reason": "If correct, say 'Correct motive!' If incorrect, give a vague, thematic nudge only—never list or describe the valid motives."
        }}
        """
        
        response = get_vertex_response(prompt, json_response=True, max_output_tokens=512, temperature=0.1)
        
        if isinstance(response, dict) and "correct" in response:
            # If incorrect, always use a generic vague hint
            if not response["correct"]:
                vague_hints = [
                    "Consider emotional or personal reasons behind the crime.",
                    "Think about hidden resentments or relationships.",
                    "Reflect on what might drive someone to act out of desperation or passion.",
                    "Sometimes the motive is rooted in the past, not just the present.",
                    "Look for clues in the victim's interactions and history."
                ]
                import random
                return {
                    "correct": False,
                    "best_match": None,
                    "similarity_ratio": response.get("confidence", 0.5),
                    "feedback": random.choice(vague_hints)
                }
            return {
                "correct": True,
                "best_match": response.get("best_match", None),
                "similarity_ratio": response.get("confidence", 0.5),
                "feedback": "Correct motive!"
            }
        # If AI fails, default to incorrect
        vague_hints = [
            "Consider emotional or personal reasons behind the crime.",
            "Think about hidden resentments or relationships.",
            "Reflect on what might drive someone to act out of desperation or passion.",
            "Sometimes the motive is rooted in the past, not just the present.",
            "Look for clues in the victim's interactions and history."
        ]
        import random
        return {
            "correct": False,
            "best_match": None,
            "similarity_ratio": 0,
            "feedback": random.choice(vague_hints)
        }
    except Exception as e:
        logger.error(f"Error in motive validation: {e}")
        return {
            "correct": False,
            "best_match": None,
            "similarity_ratio": 0,
            "feedback": "Motive validation error occurred"
        }

def generate_validation_feedback(murderer_validation: dict, motive_validation: dict, correct_murderer: str) -> str:
    """Generate detailed feedback based on validation results"""
    if murderer_validation["correct"] and motive_validation["correct"]:
        return "🎉 Excellent detective work! You've solved the mystery completely!"
    elif murderer_validation["correct"] and not motive_validation["correct"]:
        motive_feedback = motive_validation.get("feedback", "Your motive is incorrect.")
        return f"🔍 You've identified the right person, but {motive_feedback.lower()} Consider the deeper psychological and circumstantial factors that drove them to commit this crime."
    elif not murderer_validation["correct"]:
        # If murderer is wrong, do NOT give motive feedback, even if motive is correct
        murderer_feedback = murderer_validation.get("feedback", "You've accused the wrong person.")
        return f"🎭 {murderer_feedback} Re-examine the evidence and suspect relationships to find the true perpetrator."
    
    else:
        murderer_feedback = murderer_validation.get("feedback", f"That's not the right person. The murderer is {correct_murderer}.")
        motive_feedback = motive_validation.get("feedback", "Your motive is also incorrect.")
        return f"❌ {murderer_feedback} {motive_feedback} Review the clues and suspect testimonies more carefully to understand both who committed the crime and why."

@app.post("/ai_detective_chat")
async def ai_detective_chat(request_data: HintRequest):
    """Get AI detective response for conversational chat"""
    try:
        logger.info(f"🤖 AI Detective chat for mystery {request_data.mystery_id}")
        logger.info(f"🤖 Question: {request_data.question}")
        
        # Get mystery details
        mystery = mysteries.get(request_data.mystery_id)
        if not mystery:
            raise HTTPException(status_code=404, detail="Mystery not found")
        
        # Build AI prompt for detective chat
        prompt = f"""
        You are an AI detective assistant in an interactive murder mystery game. Your job is to provide clues to help players solve the mystery, but you must never directly reveal the murderer, their motive, or outright confirm suspicions. Instead, guide players toward uncovering the truth through logical deduction.

        **Response Rules:**
        - DO NOT reveal the murderer or motive directly.
        - If asked, "Who is the murderer?" or "Who killed [victim]?", respond cryptically without confirmation.
          - Example: "That would be too easy, wouldn't it? Follow the evidence, and the truth will become clear."
        - Provide ONLY hints & subtle leads.
          - Example: "[Suspect] was seen near the crime scene, but does that prove guilt? Maybe they have an alibi—or maybe not."
        - Never directly confirm or deny accusations.
        - If a player asks, "Is [suspect] the murderer?", respond with:
          - "That's an interesting theory. Consider their relationships and actions leading up to the crime."

        **Current Mystery Details:**
        - Title: {mystery['title']}
        - Story: {mystery['story']}

        Player's Question: "{request_data.question}"
        """
        
        # Get AI response
        response = get_vertex_response(prompt, json_response=False, max_output_tokens=512, temperature=0.7)
        
        logger.info(f"✅ AI detective response generated for mystery {request_data.mystery_id}")
        
        return {
            "response": response,
            "mystery_id": request_data.mystery_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting AI detective response: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get AI detective response")

@app.post("/save_result")
async def save_result(
    team_name: str = Body(...),
    mystery_id: int = Body(...),
    time_taken: int = Body(...),
    wrong_attempts: int = Body(0),
    hints_used: int = Body(0),
    score: int = Body(0),
    completed: bool = Body(True),
):
    """Save a team's result for a mystery round to the database. Do not overwrite if already exists."""
    try:
        # Check if result already exists for this team and mystery
        response = dynamo_service.leaderboard_table.scan(
            FilterExpression="team_name = :team and mystery_id = :mid",
            ExpressionAttributeValues={":team": team_name, ":mid": mystery_id}
        )
        items = response.get('Items', [])
        if items:
            return {"success": False, "message": "Result for this team and mystery already exists. Cannot overwrite."}
        # Prepare item for DynamoDB
        item = {
            "team_name": team_name,
            "mystery_id": mystery_id,
            "time_taken": time_taken,
            "wrong_guesses": wrong_attempts,
            "hints_used": hints_used,
            "score": score,
            "completed": completed,
            "timestamp": str(int(time.time())),
        }
        # Save to DynamoDB using the flexible leaderboard entry method
        await dynamo_service.save_leaderboard_entry(item)
        return {"success": True, "message": "Result saved successfully."}
    except Exception as e:
        logger.error(f"Error saving result: {e}")
        raise HTTPException(status_code=500, detail="Failed to save result.")
