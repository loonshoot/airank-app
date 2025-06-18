// Script to update all Member.findOne calls to use userId instead of email
// This script should be run from the project root with: node scripts/update-member-queries.js

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Function to process a file
function processFile(filePath) {
  console.log(`Processing ${filePath}`);
  
  try {
    // Read the file
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Check if this file contains the Member.findOne pattern
    if (content.includes('Member.findOne') && content.includes('email: user.email')) {
      console.log(`  Found Member.findOne pattern in ${filePath}`);
      
      // Replace the user check pattern
      if (content.includes('if (user && user.email)')) {
        content = content.replace(
          /if \(user && user\.email\)/g, 
          'if (user && (user._id || user.sub || user.userId))'
        );
        modified = true;
      }
      
      // Handle different variations of the Member.findOne pattern with email
      // This handles cases with different spacing and parameter formats
      content = content.replace(
        /Member\.findOne\(\s*{\s*(?:workspaceId[,:][\s\w]*,\s*|)email\s*:\s*user\.email/g,
        (match) => {
          // Extract workspaceId part if it exists
          const workspaceIdPart = match.match(/workspaceId[,:][\s\w]*/);
          const prefix = "Member.findOne({ ";
          
          if (workspaceIdPart) {
            return `${prefix}${workspaceIdPart[0]}, userId: user._id || user.sub || user.userId`;
          } else {
            return `${prefix}userId: user._id || user.sub || user.userId`;
          }
        }
      );
      modified = true;

      // Replace specific variations for workspaceId: workspaceId pattern
      content = content.replace(
        /Member\.findOne\(\s*{\s*workspaceId\s*:\s*workspaceId\s*,\s*email\s*:\s*user\.email/g,
        'Member.findOne({ workspaceId: workspaceId, userId: user._id || user.sub || user.userId'
      );
      
      // Replace any error messages
      content = content.replace(
        /User not authenticated or email not found/g,
        'User not authenticated or userId not found'
      );
      
      content = content.replace(
        /User not authenticated/g,
        'User not authenticated'
      );
      
      // If modifications were made, write the updated content back to the file
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  Updated ${filePath}`);
        return true;
      }
    }
    
    console.log(`  No pattern match or no changes made in ${filePath}`);
    return false;
  } catch (error) {
    console.error(`  Error processing ${filePath}:`, error);
    return false;
  }
}

// Main function
async function main() {
  console.log("Starting update of Member.findOne calls...");
  
  // Find all JS files in the GraphQL directories - check both src/graphql and outrun-core
  const srcFiles = glob.sync(path.join(process.cwd(), 'src/graphql/**/*.js'));
  let outrunCoreFiles = [];
  
  // Check if outrun-core directory exists
  const outrunCorePath = path.join(process.cwd(), '../outrun-core');
  if (fs.existsSync(outrunCorePath)) {
    outrunCoreFiles = glob.sync(path.join(outrunCorePath, 'graphql/**/*.js'));
    console.log(`Found ${outrunCoreFiles.length} files in outrun-core`);
  } else {
    console.log(`outrun-core directory not found at ${outrunCorePath}`);
  }
  
  const files = [...srcFiles, ...outrunCoreFiles];
  console.log(`Found a total of ${files.length} GraphQL files to check`);
  
  // Process each file
  let updatedCount = 0;
  
  for (const file of files) {
    const updated = processFile(file);
    if (updated) updatedCount++;
  }
  
  console.log(`Update complete. Modified ${updatedCount} files.`);
}

// Run the script
main().catch(error => {
  console.error("Error running the script:", error);
  process.exit(1);
}); 