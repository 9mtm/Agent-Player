"""
Fix All Local AI Agents Model Provider Issues
"""

import asyncio
from config.database import get_db
from sqlalchemy import select, update
from models.database import Agent

async def fix_all_local_agents():
    """Fix all local AI agents with incorrect model_provider fields"""
    async for db in get_db():
        try:
            # Get all agents
            result = await db.execute(select(Agent).where(Agent.is_active == True))
            agents = result.scalars().all()
            
            fixed_count = 0
            
            for agent in agents:
                print(f'\n🔍 Checking Agent ID {agent.id}: {agent.name}')
                print(f'  Current Provider: {agent.model_provider}')
                print(f'  API Endpoint: {agent.api_endpoint}')
                
                needs_fix = False
                new_provider = None
                new_model = None
                
                # Check if this is a local agent that needs fixing
                if agent.api_endpoint:
                    endpoint = agent.api_endpoint.lower()
                    
                    # Ollama detection
                    if 'localhost:11434' in endpoint or ':11434' in endpoint:
                        if agent.model_provider != 'ollama':
                            needs_fix = True
                            new_provider = 'ollama'
                            new_model = 'llama3.2:latest'
                            print(f'  🦙 Detected Ollama agent - needs fix!')
                    
                    # LM Studio detection
                    elif 'localhost:1234' in endpoint or ':1234' in endpoint:
                        if agent.model_provider != 'lmstudio':
                            needs_fix = True
                            new_provider = 'lmstudio'
                            new_model = 'llama-3-8b-instruct'
                            print(f'  🖥️ Detected LM Studio agent - needs fix!')
                    
                    # TextGen WebUI detection
                    elif 'localhost:5000' in endpoint or ':5000' in endpoint:
                        if agent.model_provider != 'textgen':
                            needs_fix = True
                            new_provider = 'textgen'
                            new_model = 'llama-2-7b-chat'
                            print(f'  📝 Detected TextGen WebUI agent - needs fix!')
                    
                    # LocalAI detection
                    elif 'localhost:8080' in endpoint or ':8080' in endpoint:
                        if agent.model_provider != 'localai':
                            needs_fix = True
                            new_provider = 'localai'
                            new_model = 'gpt-3.5-turbo'
                            print(f'  🤖 Detected LocalAI agent - needs fix!')
                
                if needs_fix:
                    print(f'  ✅ Fixing: {agent.model_provider} → {new_provider}')
                    print(f'  📝 Model: {agent.model_name} → {new_model}')
                    
                    # Update the agent
                    update_stmt = update(Agent).where(Agent.id == agent.id).values(
                        model_provider=new_provider,
                        model_name=new_model
                    )
                    
                    await db.execute(update_stmt)
                    fixed_count += 1
                else:
                    print(f'  ✅ No fix needed - provider is correct')
            
            if fixed_count > 0:
                await db.commit()
                print(f'\n🎉 Successfully fixed {fixed_count} agents!')
            else:
                print(f'\n✅ All agents are already correctly configured!')
                
        except Exception as e:
            print(f'❌ Error: {e}')
            await db.rollback()
        
        break

async def verify_all_agents():
    """Verify all agents after fix"""
    async for db in get_db():
        try:
            # Get all agents
            result = await db.execute(select(Agent).where(Agent.is_active == True))
            agents = result.scalars().all()
            
            print(f'\n🔍 VERIFICATION - All Active Agents:')
            print('=' * 60)
            
            for agent in agents:
                endpoint_type = 'Online'
                if agent.api_endpoint and 'localhost' in agent.api_endpoint:
                    endpoint_type = 'Local'
                
                print(f'ID {agent.id:2d}: {agent.name:<25} | Provider: {agent.model_provider:<10} | Model: {agent.model_name:<20} | {endpoint_type}')
                
        except Exception as e:
            print(f'❌ Error during verification: {e}')
        
        break

if __name__ == "__main__":
    print("🚀 Starting Local AI Agents Fix...")
    asyncio.run(fix_all_local_agents())
    
    print("\n" + "="*60)
    asyncio.run(verify_all_agents()) 