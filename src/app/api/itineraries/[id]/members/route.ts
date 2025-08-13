import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email, role = 'member' } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const resolvedParams = await context.params
    const { id } = resolvedParams
    // Check if user has admin permissions
    const itinerary = await prisma.itinerary.findFirst({
      where: {
        id,
        members: {
          some: {
            userId: session.user.id,
            role: 'admin',
          },
        },
      },
    })

    if (!itinerary) {
      return NextResponse.json(
        { error: 'Itinerary not found or insufficient permissions' },
        { status: 404 }
      )
    }

    // Find user by email
    const userToAdd = await prisma.user.findUnique({
      where: { email },
    })

    if (!userToAdd) {
      return NextResponse.json(
        { error: 'User with this email not found' },
        { status: 404 }
      )
    }

    // Check if user is already a member
    const existingMember = await prisma.groupMember.findFirst({
      where: {
        itineraryId: id,
        userId: userToAdd.id,
      },
    })

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this itinerary' },
        { status: 400 }
      )
    }

    // Add user to itinerary
    const member = await prisma.groupMember.create({
      data: {
        itineraryId: id,
        userId: userToAdd.id,
        role,
      },
      include: {
        user: true,
      },
    })

    return NextResponse.json(member)
  } catch (error) {
    console.error('Error adding member:', error)
    return NextResponse.json(
      { error: 'Failed to add member' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const resolvedParams = await context.params
    const { id } = resolvedParams
    // Check if requesting user has admin permissions or is removing themselves
    const itinerary = await prisma.itinerary.findFirst({
      where: {
        id,
        members: {
          some: {
            userId: session.user.id,
            ...(session.user.id !== userId && { role: 'admin' }),
          },
        },
      },
    })

    if (!itinerary) {
      return NextResponse.json(
        { error: 'Itinerary not found or insufficient permissions' },
        { status: 404 }
      )
    }

    // Don't allow removal of the creator
    if (itinerary.createdBy === userId) {
      return NextResponse.json(
        { error: 'Cannot remove the creator of the itinerary' },
        { status: 400 }
      )
    }

    // Remove member
    await prisma.groupMember.deleteMany({
      where: {
        itineraryId: id,
        userId,
      },
    })

    return NextResponse.json({ message: 'Member removed successfully' })
  } catch (error) {
    console.error('Error removing member:', error)
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, role } = body

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'User ID and role are required' },
        { status: 400 }
      )
    }

    if (role !== 'admin' && role !== 'member') {
      return NextResponse.json(
        { error: 'Role must be "admin" or "member"' },
        { status: 400 }
      )
    }

    const resolvedParams = await context.params
    const { id } = resolvedParams
    // Check if requesting user has admin permissions
    const itinerary = await prisma.itinerary.findFirst({
      where: {
        id,
        members: {
          some: {
            userId: session.user.id,
            role: 'admin',
          },
        },
      },
    })

    if (!itinerary) {
      return NextResponse.json(
        { error: 'Itinerary not found or insufficient permissions' },
        { status: 404 }
      )
    }

    // Don't allow changing the creator's role
    if (itinerary.createdBy === userId) {
      return NextResponse.json(
        { error: 'Cannot change the role of the creator' },
        { status: 400 }
      )
    }

    // Update member role
    const updatedMember = await prisma.groupMember.updateMany({
      where: {
        itineraryId: id,
        userId,
      },
      data: { role },
    })

    if (updatedMember.count === 0) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Member role updated successfully' })
  } catch (error) {
    console.error('Error updating member role:', error)
    return NextResponse.json(
      { error: 'Failed to update member role' },
      { status: 500 }
    )
  }
}