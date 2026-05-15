from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
import os

VIDEO_IDS = [
    "3jXFfiA0ULI",  # How to Hit a Softball (https://www.youtube.com/watch?v=3jXFfiA0ULI)
    "_F2ldM4zFLo",  # Coaching Youth Softball: Hitting Basics (https://www.youtube.com/watch?v=_F2ldM4zFLo)
    "zEg7sH75G4Q",  # How to Teach Your Kid How to Catch a Baseball or Softball (https://www.youtube.com/watch?v=zEg7sH75G4Q)
    "8UH_2_LEGlM",  # 6 Best Pitching Drills for Kids (https://www.youtube.com/watch?v=8UH_2_LEGlM)
    "YSbygfql6ZU",  # Coaching Youth Softball: Basics of Pitching (https://www.youtube.com/watch?v=YSbygfql6ZU)
    "mIx9CvpGXsU",  # Basic 5 Steps for a Beginner Pitcher (https://www.youtube.com/watch?v=mIx9CvpGXsU)

]

output_dir = "data/raw"
os.makedirs(output_dir, exist_ok=True)

for vid_id in VIDEO_IDS:
    try:
        fetched = YouTubeTranscriptApi().fetch(vid_id)
        
        # Correct way for the current library version
        text = " ".join(snippet.text for snippet in fetched)
        
        filepath = os.path.join(output_dir, f"yt_{vid_id}.txt")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(text)
        
        print(f"✅ Saved: {filepath} ({len(text):,} characters)")
        
    except (TranscriptsDisabled, NoTranscriptFound):
        print(f"⚠️ No transcript available for {vid_id}")
    except Exception as e:
        print(f"❌ Failed {vid_id}: {type(e).__name__} - {e}")