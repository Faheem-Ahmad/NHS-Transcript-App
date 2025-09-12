Step-by-Step Plan for MongoDB API Implementation
Step 1: Database Connection Setup
Create a MongoDB connection utility file (lib/mongodb.js or lib/mongodb.ts)
Set up connection string and database configuration
Handle connection pooling and error management
Add environment variables for MongoDB credentials
Step 2: Environment Configuration
Add MongoDB connection string to .env.local
Configure database name and collection name
Set up any authentication credentials needed
Step 3: Create the API Route
Create /src/app/api/prompts/route.ts (Next.js 13+ App Router)
Implement GET endpoint to handle prompt requests
Set up request parameter validation for:
type (string)
keyWord (string)
active (boolean - always true)
Step 4: Database Query Logic
Connect to MongoDB in the API route
Query the "Prompts" collection with the three parameters
Handle single document vs multiple document responses
Add error handling for database operations
Step 5: Response Formatting
Structure the API response consistently
Handle cases where no documents are found
Return appropriate HTTP status codes
Format the prompt content for frontend consumption
Step 6: Frontend Integration
Add click handlers to each of the 10 buttons
Map button names to appropriate type and keyWord values
Create fetch logic to call the new API endpoint
Update the system prompt textarea with fetched content
Step 7: Error Handling & Loading States
Add loading states for button clicks
Handle API errors gracefully
Show user feedback during fetch operations
Add retry logic if needed
Step 8: TypeScript Definitions
Create interfaces for MongoDB document structure
Define API request/response types
Add proper typing for the prompt data
