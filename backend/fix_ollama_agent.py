"""
Fix Ollama Agent Model Provider Issue
"""

import asyncio
from config.database import get_db
from sqlalchemy import select, update
from models.database import Agent

async def fix_ollama_agent():
    """Fix the Ollama agent's model_provider field"""
    async for db in get_db():
        try:
            # Get agent with id 20 (Ollama agent)
            result = await db.execute(select(Agent).where(Agent.id == 20))
            agent = result.scalar_one_or_none()
            
            if agent:
                print(f'Found Ollama Agent:')
                print(f'  ID: {agent.id}')
                print(f'  Name: {agent.name}')
                print(f'  Current Model Provider: {agent.model_provider}')
                print(f'  Current Model Name: {agent.model_name}')
                print(f'  API Endpoint: {agent.api_endpoint}')
                
                # Check if this is indeed an Ollama agent that needs fixing
                if agent.api_endpoint and 'localhost:11434' in agent.api_endpoint:
                    print('\n✅ This is an Ollama agent - fixing model_provider...')
                    
                    # Update the agent
                    update_stmt = update(Agent).where(Agent.id == 20).values(
                        model_provider='ollama',
                        model_name='llama3.2:latest'  # Set to a proper Ollama model
                    )
                    
                    await db.execute(update_stmt)
                    await db.commit()
                    
                    print('✅ Successfully updated Ollama agent!')
                    
                    # Verify the fix
                    result = await db.execute(select(Agent).where(Agent.id == 20))
                    updated_agent = result.scalar_one_or_none()
                    
                    if updated_agent:
                        print('\n🔍 Verification - Updated Agent Data:')
                        print(f'  Model Provider: {updated_agent.model_provider}')
                        print(f'  Model Name: {updated_agent.model_name}')
                        print(f'  API Endpoint: {updated_agent.api_endpoint}')
                else:
                    print('❌ This agent does not appear to be an Ollama agent')
            else:
                print('❌ Agent with ID 20 not found')
                
        except Exception as e:
            print(f'❌ Error: {e}')
            await db.rollback()
        
        break

if __name__ == "__main__":
    asyncio.run(fix_ollama_agent()) 