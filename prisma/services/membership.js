import { InvitationStatus } from '@prisma/client';
import prisma from '@/prisma/index';

export const getMember = async (id) =>
  await prisma.member.findFirst({
    select: { teamRole: true, permissions: true },
    where: { id },
  });

export const getMemberByWorkspaceAndEmail = async (workspaceId, email) =>
  await prisma.member.findFirst({
    select: { id: true, teamRole: true, permissions: true, status: true },
    where: {
      workspaceId,
      email,
      deletedAt: { isSet: false }
    },
  });

export const getMembers = async (slug) =>
  await prisma.member.findMany({
    select: {
      id: true,
      email: true,
      status: true,
      teamRole: true,
      permissions: true,
      member: { select: { name: true } },
    },
    where: {
      deletedAt: { isSet: false },
      workspace: {
        deletedAt: { isSet: false },
        slug,
      },
    },
  });

export const getPendingInvitations = async (email) =>
  await prisma.member.findMany({
    select: {
      id: true,
      email: true,
      joinedAt: true,
      status: true,
      teamRole: true,
      invitedBy: {
        select: {
          email: true,
          name: true,
        },
      },
      workspace: {
        select: {
          createdAt: true,
          inviteCode: true,
          name: true,
          slug: true,
          workspaceCode: true,
          creator: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      },
    },
    where: {
      deletedAt: { isSet: false },
      email,
      status: InvitationStatus.PENDING,
      workspace: { deletedAt: { isSet: false } },
    },
  });

export const remove = async (id) =>
  await prisma.member.update({
    data: { deletedAt: new Date() },
    where: { id },
  });

export const toggleRole = async (id, teamRole) =>
  await prisma.member.update({
    data: { teamRole },
    where: { id },
  });

export const updateStatus = async (id, status) =>
  await prisma.member.update({
    data: { status },
    where: { id },
  });

export const updatePermissions = async (id, permissions) =>
  await prisma.member.update({
    data: { permissions, updatedAt: new Date() },
    where: { id },
  });

export const getMemberById = async (id) =>
  await prisma.member.findFirst({
    select: {
      id: true,
      teamRole: true,
      permissions: true,
      status: true,
      email: true,
      workspaceId: true
    },
    where: { id, deletedAt: { isSet: false } },
  });
