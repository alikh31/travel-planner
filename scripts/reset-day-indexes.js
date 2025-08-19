// Production database migration script to fix Day.dayIndex unique constraint
// This script reorders dayIndex values to be sequential for each itinerary

const { PrismaClient } = require('@prisma/client')

async function fixDayIndexes() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔧 Starting Day.dayIndex migration...')
    
    // Get all itineraries
    const itineraries = await prisma.itinerary.findMany({
      include: {
        days: {
          orderBy: {
            date: 'asc'
          }
        }
      }
    })
    
    console.log(`📊 Found ${itineraries.length} itineraries to process`)
    
    for (const itinerary of itineraries) {
      console.log(`🔄 Processing itinerary ${itinerary.id} with ${itinerary.days.length} days`)
      
      // Update each day with correct sequential index
      for (let i = 0; i < itinerary.days.length; i++) {
        const day = itinerary.days[i]
        if (day.dayIndex !== i) {
          console.log(`  📝 Updating day ${day.id}: dayIndex ${day.dayIndex} → ${i}`)
          await prisma.day.update({
            where: { id: day.id },
            data: { dayIndex: i }
          })
        }
      }
    }
    
    console.log('✅ Day.dayIndex migration completed successfully!')
    
    // Verify no duplicates remain
    const duplicates = await prisma.$queryRaw`
      SELECT itineraryId, dayIndex, COUNT(*) as count 
      FROM Day 
      GROUP BY itineraryId, dayIndex 
      HAVING COUNT(*) > 1
    `
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate dayIndex values found')
    } else {
      console.error('❌ Still found duplicates:', duplicates)
      throw new Error('Migration failed - duplicates still exist')
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
if (require.main === module) {
  fixDayIndexes()
    .then(() => {
      console.log('🎉 Migration completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error)
      process.exit(1)
    })
}

module.exports = { fixDayIndexes }