//prisma/services/workspace.js
import { InvitationStatus, TeamRole } from '@prisma/client';
import slugify from 'slugify';

import {
  html as createHtml,
  text as createText,
} from '@/config/email-templates/workspace-create';
import {
  html as inviteHtml,
  text as inviteText,
} from '@/config/email-templates/invitation';
import { sendMail } from '@/lib/server/mail';
import prisma from '@/prisma/index';

// Generate a URL-friendly slug from a string
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Generate a random ID of specified length
function generateId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const countWorkspaces = async (slug) =>
  await prisma.workspace.count({
    where: { slug: { startsWith: slug } },
  });

export const createWorkspace = async (
  name,
  creatorId,
  teamName,
  creatorEmail,
  description
) => {
  // Log the creation request
  console.log(`Creating workspace: ${name} for creator ${creatorId || 'N/A'} with email ${creatorEmail || 'N/A'}`);
  
  try {
    // Validate inputs
    if (!name) {
      console.error("Cannot create workspace: name is required");
      throw new Error("Workspace name is required");
    }
    
    if (!creatorId && !creatorEmail) {
      console.error("Cannot create workspace: either creatorId or creatorEmail is required");
      throw new Error("Creator identification is required");
    }
    
    // Generate a slug from the name
    const slug = generateSlug(name);
    console.log(`Generated slug: ${slug}`);
    
    // Create the workspace with the creator as the first member
    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        members: {
          create: {
            // The creator is always the first member
            userId: creatorId,
            // Email is optional now, only include if present
            ...(creatorEmail ? { email: creatorEmail } : {}),
            member: {
              connect: creatorId ? { id: creatorId } : undefined,
            },
            status: "ACCEPTED",
            teamRole: "OWNER",
            joinedAt: new Date(),
          },
        },
        creator: {
          connect: {
            id: creatorId,
          },
        },
        workspaceCode: generateId(8),
        inviteCode: generateId(8),
        ...(teamName && { teamName }),
        ...(description && { description }),
      },
      include: {
        creator: true,
        members: {
          include: {
            member: true,
          },
        },
      },
    });
    
    console.log(`Workspace created successfully: ${workspace.id}`);
    return workspace;
  } catch (error) {
    console.error("Error creating workspace:", error);
    throw error;
  }
};

export const deleteWorkspace = async (id, email, slug) => {
  const workspace = await getOwnWorkspace(id, email, slug);

  if (workspace) {
    await prisma.workspace.update({
      data: { deletedAt: new Date() },
      where: { id: workspace.id },
    });
    return slug;
  } else {
    throw new Error('Unable to find workspace');
  }
};

export const getInvitation = async (inviteCode) =>
  await prisma.workspace.findFirst({
    select: {
      id: true,
      name: true,
      workspaceCode: true,
      slug: true,
    },
    where: {
      deletedAt: { isSet: false },
      inviteCode,
    },
  });

export const getOwnWorkspace = async (id, email, slug) => {
  // Validate that we at least have an id or email and a slug
  if (!slug) {
    console.error("No slug provided to getOwnWorkspace");
    return null;
  }
  
  if (!id && !email) {
    console.error("Neither userId nor email provided to getOwnWorkspace");
    return null;
  }
  
  console.log(`Getting own workspace with userId: ${id || 'N/A'}, email: ${email || 'N/A'}, slug: ${slug}`);
  
  // Build OR conditions based on available identifiers
  const orConditions = [];
  
  // Always include the workspace ID condition if present
  if (id) {
    orConditions.push({ id });
  }
  
  // Add member conditions for owners
  if (id) {
    orConditions.push({
      members: {
        some: {
          userId: id,
          deletedAt: { isSet: false },
          teamRole: TeamRole.OWNER,
        },
      },
    });
  } else if (email) {
    orConditions.push({
      members: {
        some: {
          email: email,
          deletedAt: { isSet: false },
          teamRole: TeamRole.OWNER,
        },
      },
    });
  }
  
  return await prisma.workspace.findFirst({
    select: {
      id: true,
      inviteCode: true,
      name: true,
    },
    where: {
      OR: orConditions,
      AND: {
        deletedAt: { isSet: false },
        slug,
      },
    },
  });
};

export const getSiteWorkspace = async (slug, customDomain) => {
  if (!slug) {
    console.error("No slug provided to getSiteWorkspace");
    return null;
  }
  
  console.log(`Getting site workspace with slug: ${slug}, customDomain: ${customDomain ? 'true' : 'false'}`);
  
  // Build OR conditions based on available identifiers
  const orConditions = [];
  
  // Always check slug
  orConditions.push({ slug });
  
  // Check custom domain if enabled
  if (customDomain) {
    orConditions.push({
      domains: {
        some: {
          name: slug,
          deletedAt: { isSet: false },
        },
      },
    });
  }
  
  return await prisma.workspace.findFirst({
    select: {
      id: true,
      name: true,
      slug: true,
      domains: { select: { name: true } },
    },
    where: {
      OR: orConditions,
      AND: { deletedAt: { isSet: false } },
    },
  });
};

export const getWorkspace = async (id, email, slug) => {
  // Validate that we at least have a slug
  if (!slug) {
    console.error("No slug provided to getWorkspace");
    return null;
  }
  
  console.log(`Getting workspace with userId: ${id || 'N/A'}, email: ${email || 'N/A'}, slug: ${slug}`);
  
  try {
    // Simplest possible query - just get the workspace by slug first
    const workspace = await prisma.workspace.findFirst({
      select: {
        id: true,
        creatorId: true,
        name: true,
        inviteCode: true,
        slug: true,
        workspaceCode: true
      },
      where: {
        slug: slug,
        deletedAt: { isSet: false }
      }
    });
    
    if (!workspace) {
      console.log(`No workspace found with slug ${slug}`);
      return null;
    }
    
    // Now we have the basic workspace, add related data without risking null fields
    
    // 1. Add creator info (carefully)
    let creator = null;
    try {
      creator = await prisma.user.findUnique({
        select: { id: true, email: true },
        where: { id: workspace.creatorId }
      });
    } catch (err) {
      console.log(`Could not fetch creator for workspace ${workspace.id}: ${err.message}`);
    }
    
    // 2. Add members info (safely) - now handling nullable email
    let members = [];
    try {
      members = await prisma.member.findMany({
        select: {
          id: true,
          userId: true,
          teamRole: true,
          status: true
        },
        where: {
          workspaceId: workspace.id,
          deletedAt: { isSet: false },
          // Only match by userId, since email might be null
          userId: { not: null }
        }
      });
    } catch (err) {
      console.log(`Could not fetch members for workspace ${workspace.id}: ${err.message}`);
    }
    
    // Check if user has access to this workspace
    let hasAccess = false;
    
    if (id) {
      hasAccess = members.some(member => member.userId === id);
    }
    
    if (!hasAccess && email) {
      hasAccess = members.some(member => member.email === email);
    }
    
    // For now, return the workspace regardless of access
    // This allows pages to show a "no access" message if needed
    
    // Return combined data
    return {
      ...workspace,
      creator: creator ? { email: creator.email } : null,
      members: members
    };
  } catch (error) {
    console.error(`Error getting workspace:`, error);
    return null;
  }
};

export const getWorkspaces = async (id, email) => {
  try {
    console.log(`getWorkspaces called with id: ${id || 'N/A'}, email: ${email || 'N/A'}`);
    
    // Base query structure with all the fields we want to select
    const baseQuery = {
      select: {
        id: true,
        createdAt: true,
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        inviteCode: true,
        members: {
          select: {
            id: true,
            userId: true,
            email: true,
            member: {
              select: {
                id: true,
                email: true,
                image: true,
                name: true,
              },
            },
            joinedAt: true,
            status: true,
            teamRole: true,
          },
        },
        name: true,
        slug: true,
        workspaceCode: true,
      },
      where: {
        deletedAt: { isSet: false }
      }
    };
    
    // Try different query strategies based on available identifiers
    let workspaces = [];
    
    // If we have a user ID, try that first - this is the preferred way
    if (id) {
      const workspacesById = await prisma.workspace.findMany({
        ...baseQuery,
        where: {
          ...baseQuery.where,
          members: {
            some: {
              userId: id,
              deletedAt: { isSet: false },
              status: "ACCEPTED"
            }
          }
        }
      });
      
      if (workspacesById.length > 0) {
        console.log(`Found ${workspacesById.length} workspaces by userId`);
        workspaces = workspacesById;
      } else if (email) {
        // Fallback to email if we have one and userId lookup failed
        // Only query email if provided and not null
        const workspacesByEmail = await prisma.workspace.findMany({
          ...baseQuery,
          where: {
            ...baseQuery.where,
            members: {
              some: {
                email: email,
                deletedAt: { isSet: false },
                status: "ACCEPTED"
              }
            }
          }
        });
        
        console.log(`Found ${workspacesByEmail.length} workspaces by email`);
        workspaces = workspacesByEmail;
      }
    } else if (email) {
      // If we only have email, use that directly
      const workspacesByEmail = await prisma.workspace.findMany({
        ...baseQuery,
        where: {
          ...baseQuery.where,
          members: {
            some: {
              email: email,
              deletedAt: { isSet: false },
              status: "ACCEPTED"
            }
          }
        }
      });
      
      console.log(`Found ${workspacesByEmail.length} workspaces by email`);
      workspaces = workspacesByEmail;
    }
    
    // In case we don't have any identifiers or no workspaces were found
    if ((!id && !email) || workspaces.length === 0) {
      // New query - get all workspaces if user has admin level access
      try {
        // Check if user is admin (replace with your admin check)
        const isAdmin = false; // Replace with actual admin check
        
        if (isAdmin) {
          console.log("User is admin, returning all workspaces");
          const allWorkspaces = await prisma.workspace.findMany({
            ...baseQuery,
            where: {
              deletedAt: { isSet: false }
            }
          });
          
          return allWorkspaces;
        }
      } catch (err) {
        console.log("Admin check failed:", err);
      }
      
      console.log("No workspaces found for user");
      return [];
    }
    
    return workspaces;
  } catch (error) {
    console.error("Error in getWorkspaces:", error);
    return [];
  }
};

export const getWorkspacePaths = async () => {
  const [workspaces, domains] = await Promise.all([
    prisma.workspace.findMany({
      select: { slug: true },
      where: { deletedAt: { isSet: false } },
    }),
    prisma.domain.findMany({
      select: { name: true },
      where: { deletedAt: { isSet: false } },
    }),
  ]);
  return [
    ...workspaces.map((workspace) => ({
      params: { site: workspace.slug },
    })),
    ...domains.map((domain) => ({
      params: { site: domain.name },
    })),
  ];
};

export const inviteUsers = async (id, email, members, slug) => {
  if (!slug) {
    throw new Error('No workspace slug provided');
  }
  
  if (!id && !email) {
    throw new Error('No user identifier provided');
  }
  
  console.log(`Inviting users to workspace: ${slug}`);
  
  const workspace = await getOwnWorkspace(id, email, slug);
  // Use ID if available, otherwise use email as the inviter
  const inviter = id || email;

  if (!workspace) {
    throw new Error('Unable to find workspace');
  }

  // Validate members array
  if (!members || !Array.isArray(members) || members.length === 0) {
    throw new Error('No members to invite');
  }
  
  // Make sure all members have an email
  const invalidMembers = members.filter(member => !member.email);
  if (invalidMembers.length > 0) {
    throw new Error('All members must have an email address');
  }

  // Check if the provided emails already exist in the same workspace
  const existingEmails = await prisma.member.findMany({
    where: {
      workspaceId: workspace.id,
      email: {
        in: members.map(({ email }) => email),
      },
    },
  });

  if (existingEmails.length > 0) {
    throw new Error('One or more emails already exist in the workspace');
  }

  const membersList = members.map(({ email, role }) => ({
    email,
    inviter,
    teamRole: role,
  }));
  const data = members.map(({ email }) => ({
    createdAt: new Date(),
    email,
  }));

  await Promise.all([
    prisma.user.createMany({
      data,
      skipDuplicates: true, // Skip if user already exists
    }),
    prisma.workspace.update({
      data: {
        members: {
          createMany: {
            data: membersList,
          },
        },
      },
      where: { id: workspace.id },
    }),
    sendMail({
      html: inviteHtml({ code: workspace.inviteCode, name: workspace.name }),
      subject: `[Outrun] You have been invited to join ${workspace.name} workspace`,
      text: inviteText({ code: workspace.inviteCode, name: workspace.name }),
      to: members.map((member) => member.email),
    }),
  ]);

  return membersList;
};

export const isWorkspaceCreator = (id, creatorId) => id === creatorId;

export const isWorkspaceOwner = (email, workspace) => {
  let isTeamOwner = false;
  const member = workspace.members.find(
    (member) => member.email === email && member.teamRole === TeamRole.OWNER
  );

  if (member) {
    isTeamOwner = true;
  }

  return isTeamOwner;
};

export const joinWorkspace = async (workspaceCode, email) => {
  const workspace = await prisma.workspace.findFirst({
    select: {
      creatorId: true,
      id: true,
    },
    where: {
      deletedAt: { isSet: false },
      workspaceCode,
    },
  });

  if (workspace) {
    await prisma.member.upsert({
      create: {
        workspaceId: workspace.id,
        email,
        inviter: workspace.creatorId,
        status: InvitationStatus.ACCEPTED,
      },
      update: {},
      where: { email },
    });
    return new Date();
  } else {
    throw new Error('Unable to find workspace');
  }
};

export const updateName = async (id, email, name, slug) => {
  const workspace = await getOwnWorkspace(id, email, slug);

  if (workspace) {
    await prisma.workspace.update({
      data: { name },
      where: { id: workspace.id },
    });
    return name;
  } else {
    throw new Error('Unable to find workspace');
  }
};

export const updateSlug = async (id, email, newSlug, pathSlug) => {
  let slug = slugify(newSlug.toLowerCase());
  const count = await countWorkspaces(slug);

  if (count > 0) {
    slug = `${slug}-${count}`;
  }

  const workspace = await getOwnWorkspace(id, email, pathSlug);

  if (workspace) {
    await prisma.workspace.update({
      data: { slug },
      where: { id: workspace.id },
    });
    return slug;
  } else {
    throw new Error('Unable to find workspace');
  }
};