# Memories 

## **What it is** 
Memories is a calendar app that allows users to record their daily lives with a text entry, an audio recording and/or an image that the user can upload or use AI to create. With an added touch, there's a mood tracker! 
 - AI can view your entry and give an appropriate mood.
 - Mood analyzer dashboard, lets you see your weekly moods. Can help make decisions to allow you to strive for a more positive moods.

## **What we learned, what inspired us, and challenges we faced** 

## _Inspiration_
Our inspiration came from the reality of our busy lives. We often forget to record meaningful moments, and when we look back, entire weeks or months feel like a blur.
We wanted to build something that:
- Helps preserve daily experiences
- Encourages reflection
- Supports mental well-being

By combining journaling with mood tracking, we aimed to create a tool that promotes a more positive lifestyle.

## _What we learned_ 
- The importance of clear and structured user stories when designing features
- How AI can be useful for analysis and personalization
- That tools like Backboard.io can help improve workflows by remembering and reusing 
   relevant information, which can support more consistent AI prompts

## _Challenges_
 - Misunderstanding requirements early on, and struggling to find relevant user stories
 - Making sure that the mood analysis was meaningful and not just a random AI feature  

## **How we built the project** 
Languages, frameworks, libraries: JavaScript, react, vite, nodejs, express 
AI tools used: ClaudeAI

## Deployment

This repository has a Vite frontend in `client` and an Express API in `server`.
The deployed frontend needs a deployed backend URL; the local Vite proxy only works during `npm run dev`.

### Frontend on Vercel

Set this environment variable in Vercel:

```bash
VITE_API_BASE_URL=https://your-backend-url.example.com
```

Then redeploy the Vercel project. The included `vercel.json` builds `client` and serves the Vite output.

### Backend

Deploy the `server` folder to a Node host such as Render, Railway, Fly.io, or another service that supports a persistent disk if you want to keep using SQLite.

Required/recommended backend environment variables:

```bash
PORT=3001
CORS_ORIGIN=https://husky-hack-3923.vercel.app
SQLITE_PATH=/path/to/persistent/diary.sqlite
GEMINI_API_KEY=your_gemini_key
BACKBOARD_API_KEY=your_backboard_key
```

For Render with a persistent disk, `SQLITE_PATH` can be something like `/var/data/diary.sqlite`.
