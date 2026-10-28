# AI-Enabled Content Sharing Platform

AI-powered content sharing platform backend built with Node.js, Express, and MongoDB, featuring JWT authentication, post and draft management, admin approval workflows, and Google Gemini-powered content improvement.

## Requirements

- Node.js 20+
- MongoDB
- A Gemini API key to use AI improvement

## Run locally

1. Copy `.env.example` to `.env` and set `MONGODB_URI` and `JWT_SECRET`. Set `GEMINI_API_KEY` to enable the AI improvement route.
2. Install packages with `npm install`.
3. Start MongoDB.
4. Run `npm run dev` for development or `npm start` for production.

The API listens on port `3000` by default. `GET /health` pings MongoDB and returns HTTP `200` only when the database is reachable; otherwise, it returns HTTP `503`.

## Authentication

Register with `POST /auth/register`, then log in with `POST /auth/login`. Send the returned token as `Authorization: Bearer <token>` on protected endpoints. Public registration always creates a `user`; assign the `admin` role through a trusted database/administrative process.

## Routes

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Create a user |
| POST | `/auth/login` | Public | Log in and receive a JWT |
| GET | `/auth/me` | User | Get the current user |
| POST | `/posts` | User | Create a draft or pending post |
| GET | `/posts` | Public | List approved posts |
| GET | `/posts/my-posts` | User | List the current user's posts |
| GET | `/posts/:id` | Public | Get an approved post |
| PATCH | `/posts/:id` | Owner | Update a post; content edits to approved posts return them to review |
| DELETE | `/posts/:id` | Owner | Delete a post and its files |
| GET | `/admin/posts/pending` | Admin | List posts awaiting review |
| PATCH | `/admin/posts/approve/:id` | Admin | Approve a pending post |
| PATCH | `/admin/posts/reject/:id` | Admin | Reject a pending post |
| POST | `/ai/improve/:postId` | Owner | Create a separate improved draft with Gemini |
| GET | `/media/:filename` | Public/owner/admin | View an image, subject to the post's visibility |

Post creation and updates accept `application/json` or `multipart/form-data`. For multipart requests, use `image` for one image and `documents` for up to five documents. Images are limited to JPEG, PNG, and WebP; documents are limited to PDF, TXT, and Markdown. Each upload is limited to 10 MB. `/ai/improve/:postId` also accepts optional `documents` multipart fields; those are processed for that request and removed from local storage afterward.

Gemini receives the post title, description, content, and any attached PDF/text documents. Its response is saved as a new draft with `sourcePost` pointing to the original. The original is never overwritten. Gemini Files API documents are uploaded for the request; Google documents that uploaded files are retained for 48 hours.

## Notes

- The local `uploads/` directory is suitable for development. Use persistent object storage for production deployments with ephemeral filesystems or multiple API instances.
- Admin role assignment is intentionally not exposed through public registration.
- This starter does not include password reset, email verification, or refresh tokens.
