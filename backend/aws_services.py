import boto3
import os
from typing import List, Dict, Any, Optional
from datetime import datetime
import json

class DynamoDBService:
    def __init__(self):
        self.use_dynamodb = True
        self.teams_storage = {}  # Fallback in-memory storage
        self.leaderboard_storage = []  # Fallback in-memory storage
        
        try:
            print("🔧 Initializing DynamoDB connection...")
            self.dynamodb = boto3.resource(
                'dynamodb',
                aws_access_key_id=,
                aws_secret_access_key='',
                region_name='ap-south-1',
                config=boto3.session.Config(
                    connect_timeout=5,
                    read_timeout=5,
                    retries={'max_attempts': 2}
                )
            )
            print("✅ DynamoDB resource created successfully")
            
            self.leaderboard_table = self.dynamodb.Table('murder-mystery-leaderboard')
            self.teams_table = self.dynamodb.Table('murder-mystery-teams')
            self.game_sessions_table = self.dynamodb.Table('murder-mystery-game-sessions')
            print("✅ DynamoDB tables initialized")
            
        except Exception as e:
            print(f"❌ Error initializing DynamoDB: {e}")
            print("🔄 Falling back to in-memory storage")
            self.use_dynamodb = False
    
    def create_tables(self):
        """Create DynamoDB tables if they don't exist"""
        try:
            # Create leaderboard table
            self.dynamodb.create_table(
                TableName='murder-mystery-leaderboard',
                KeySchema=[
                    {'AttributeName': 'team_name', 'KeyType': 'HASH'},
                    {'AttributeName': 'timestamp', 'KeyType': 'RANGE'}
                ],
                AttributeDefinitions=[
                    {'AttributeName': 'team_name', 'AttributeType': 'S'},
                    {'AttributeName': 'timestamp', 'AttributeType': 'S'}
                ],
                BillingMode='PAY_PER_REQUEST'
            )
            print("Leaderboard table created successfully")
        except Exception as e:
            if 'Table already exists' not in str(e):
                print(f"Error creating leaderboard table: {e}")
        
        try:
            # Create teams table
            self.dynamodb.create_table(
                TableName='murder-mystery-teams',
                KeySchema=[
                    {'AttributeName': 'team_name', 'KeyType': 'HASH'}
                ],
                AttributeDefinitions=[
                    {'AttributeName': 'team_name', 'AttributeType': 'S'}
                ],
                BillingMode='PAY_PER_REQUEST'
            )
            print("Teams table created successfully")
        except Exception as e:
            if 'Table already exists' not in str(e):
                print(f"Error creating teams table: {e}")
        
        try:
            # Create game sessions table
            self.dynamodb.create_table(
                TableName='murder-mystery-game-sessions',
                KeySchema=[
                    {'AttributeName': 'session_id', 'KeyType': 'HASH'}
                ],
                AttributeDefinitions=[
                    {'AttributeName': 'session_id', 'AttributeType': 'S'}
                ],
                BillingMode='PAY_PER_REQUEST'
            )
            print("Game sessions table created successfully")
        except Exception as e:
            if 'Table already exists' not in str(e):
                print(f"Error creating game sessions table: {e}")
    
    def register_team(self, team_name: str, password: str) -> bool:
        """Register a new team with password validation"""
        team_name = team_name.lower()
        if not self.use_dynamodb:
            # Use in-memory storage
            if team_name in self.teams_storage:
                print(f"❌ Team '{team_name}' already exists (in-memory)")
                return False
            
            self.teams_storage[team_name] = {
                'password': password,
                'created_at': datetime.now().isoformat()
            }
            print(f"✅ Team '{team_name}' registered successfully (in-memory)")
            return True
        
        try:
            print(f"🔍 Checking if team '{team_name}' already exists...")
            # Check if team already exists
            response = self.teams_table.get_item(Key={'team_name': team_name})
            print(f"🔍 DynamoDB get_item response received")
            if 'Item' in response:
                print(f"❌ Team '{team_name}' already exists")
                return False  # Team already exists
            
            print(f"✅ Team '{team_name}' doesn't exist, creating new team...")
            # Store team with hashed password (in production, use proper hashing)
            self.teams_table.put_item(Item={
                'team_name': team_name,
                'password': password,  # In production, hash this
                'created_at': datetime.now().isoformat()
            })
            print(f"✅ DynamoDB put_item completed")
            print(f"✅ Team '{team_name}' registered successfully")
            return True
        except Exception as e:
            print(f"❌ Error registering team '{team_name}': {e}")
            return False
    
    def check_team_exists(self, team_name: str) -> bool:
        """Check if a team exists in the database"""
        team_name = team_name.lower()
        if not self.use_dynamodb:
            # Use in-memory storage
            exists = team_name in self.teams_storage
            print(f"🔍 Team '{team_name}' exists (in-memory): {exists}")
            return exists
        
        try:
            print(f"🔍 Checking if team '{team_name}' exists in database...")
            response = self.teams_table.get_item(Key={'team_name': team_name})
            exists = 'Item' in response
            print(f"🔍 Team '{team_name}' exists: {exists}")
            return exists
        except Exception as e:
            print(f"❌ Error checking team existence for '{team_name}': {e}")
            return False
    
    def validate_team(self, team_name: str, password: str) -> bool:
        """Validate team credentials"""
        team_name = team_name.lower()
        if not self.use_dynamodb:
            # Use in-memory storage
            if team_name not in self.teams_storage:
                print(f"❌ Team '{team_name}' not found during validation (in-memory)")
                return False
            
            stored_password = self.teams_storage[team_name].get('password', '')
            is_valid = password == stored_password
            print(f"🔐 Password validation for '{team_name}' (in-memory): {is_valid}")
            return is_valid
        
        try:
            print(f"🔐 Validating password for team '{team_name}'...")
            response = self.teams_table.get_item(Key={'team_name': team_name})
            if 'Item' not in response:
                print(f"❌ Team '{team_name}' not found during validation")
                return False
            
            stored_password = response['Item'].get('password', '')
            is_valid = password == stored_password
            print(f"🔐 Password validation for '{team_name}': {is_valid}")
            return is_valid
        except Exception as e:
            print(f"❌ Error validating team '{team_name}': {e}")
            return False
    
    def save_game_result(self, team_name: str, mystery_id: int, time_taken: int, 
                        completed: bool = True) -> bool:
        """Save game result to leaderboard"""
        try:
            timestamp = datetime.now().isoformat()
            self.leaderboard_table.put_item(Item={
                'team_name': team_name,
                'timestamp': timestamp,
                'mystery_id': mystery_id,
                'time_taken': time_taken,
                'completed': completed,
                'score': self._calculate_score(time_taken, completed)
            })
            return True
        except Exception as e:
            print(f"Error saving game result: {e}")
            return False
    
    def get_leaderboard(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get top teams from leaderboard, aggregated by team_name (cumulative score)"""
        try:
            response = self.leaderboard_table.scan()
            items = response.get('Items', [])
            team_stats = {}
            for item in items:
                team = item.get('team_name')
                if not team:
                    continue
                score = int(item.get('score', 0))
                time_taken = int(item.get('time_taken', 0))
                completed = item.get('completed', False)
                if team not in team_stats:
                    team_stats[team] = {
                        'team_name': team,
                        'total_score': 0,
                        'total_time': 0,
                        'mysteries_completed': 0,
                    }
                team_stats[team]['total_score'] += score
                team_stats[team]['total_time'] += time_taken
                if completed:
                    team_stats[team]['mysteries_completed'] += 1
            # Convert to list and sort
            leaderboard = list(team_stats.values())
            leaderboard.sort(key=lambda x: (-x['total_score'], x['total_time']))
            return leaderboard[:limit]
        except Exception as e:
            print(f"Error getting leaderboard: {e}")
            return []
    
    def get_team_stats(self, team_name: str) -> Dict[str, Any]:
        """Get statistics for a specific team"""
        try:
            response = self.leaderboard_table.query(
                KeyConditionExpression='team_name = :team',
                ExpressionAttributeValues={':team': team_name}
            )
            items = response.get('Items', [])
            
            if not items:
                return {
                    'team_name': team_name,
                    'total_games': 0,
                    'completed_games': 0,
                    'average_score': 0,
                    'best_score': 0,
                    'total_time': 0
                }
            
            total_games = len(items)
            completed_games = len([item for item in items if item.get('completed', False)])
            scores = [item.get('score', 0) for item in items if item.get('completed', False)]
            times = [item.get('time_taken', 0) for item in items if item.get('completed', False)]
            
            return {
                'team_name': team_name,
                'total_games': total_games,
                'completed_games': completed_games,
                'average_score': sum(scores) / len(scores) if scores else 0,
                'best_score': max(scores) if scores else 0,
                'total_time': sum(times) if times else 0
            }
        except Exception as e:
            print(f"Error getting team stats: {e}")
            return {
                'team_name': team_name,
                'total_games': 0,
                'completed_games': 0,
                'average_score': 0,
                'best_score': 0,
                'total_time': 0
            }
    
    def _calculate_score(self, time_taken: int, completed: bool) -> int:
        """Calculate score based on time taken and completion"""
        if not completed:
            return 0
        
        # Base score of 1000, subtract time penalty
        # Each second adds 1 point penalty, max penalty of 500
        time_penalty = min(time_taken, 500)
        return max(1000 - time_penalty, 100)  # Minimum score of 100

    async def save_game_session(self, session_data: Dict[str, Any]) -> bool:
        """Save a new game session"""
        try:
            if not self.use_dynamodb:
                # Use in-memory storage for game sessions
                session_id = session_data['session_id']
                self.game_sessions_storage = getattr(self, 'game_sessions_storage', {})
                self.game_sessions_storage[session_id] = session_data
                print(f"✅ Game session saved (in-memory): {session_id}")
                return True
            
            # Create game sessions table if it doesn't exist
            try:
                self.game_sessions_table = self.dynamodb.Table('murder-mystery-game-sessions')
            except:
                # Table doesn't exist, create it
                self.dynamodb.create_table(
                    TableName='murder-mystery-game-sessions',
                    KeySchema=[
                        {'AttributeName': 'session_id', 'KeyType': 'HASH'}
                    ],
                    AttributeDefinitions=[
                        {'AttributeName': 'session_id', 'AttributeType': 'S'}
                    ],
                    BillingMode='PAY_PER_REQUEST'
                )
                self.game_sessions_table = self.dynamodb.Table('murder-mystery-game-sessions')
            
            self.game_sessions_table.put_item(Item=session_data)
            print(f"✅ Game session saved: {session_data['session_id']}")
            return True
        except Exception as e:
            print(f"❌ Error saving game session: {e}")
            return False
    
    async def get_game_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get a game session by session_id"""
        try:
            if not self.use_dynamodb:
                # Use in-memory storage
                self.game_sessions_storage = getattr(self, 'game_sessions_storage', {})
                session = self.game_sessions_storage.get(session_id)
                print(f"🔍 Game session retrieved (in-memory): {session_id} - {session is not None}")
                return session
            
            response = self.game_sessions_table.get_item(Key={'session_id': session_id})
            session = response.get('Item')
            print(f"🔍 Game session retrieved: {session_id} - {session is not None}")
            return session
        except Exception as e:
            print(f"❌ Error getting game session: {e}")
            return None
    
    async def update_game_session(self, session_id: str, update_data: Dict[str, Any]) -> bool:
        """Update a game session"""
        try:
            if not self.use_dynamodb:
                # Use in-memory storage
                self.game_sessions_storage = getattr(self, 'game_sessions_storage', {})
                if session_id in self.game_sessions_storage:
                    self.game_sessions_storage[session_id].update(update_data)
                    print(f"✅ Game session updated (in-memory): {session_id}")
                    return True
                return False
            
            # Build update expression
            update_expression = "SET "
            expression_values = {}
            
            for key, value in update_data.items():
                update_expression += f"{key} = :{key}, "
                expression_values[f":{key}"] = value
            
            update_expression = update_expression.rstrip(", ")
            
            self.game_sessions_table.update_item(
                Key={'session_id': session_id},
                UpdateExpression=update_expression,
                ExpressionAttributeValues=expression_values
            )
            print(f"✅ Game session updated: {session_id}")
            return True
        except Exception as e:
            print(f"❌ Error updating game session: {e}")
            return False
    
    async def save_leaderboard_entry(self, entry_data: Dict[str, Any]) -> bool:
        """Save a leaderboard entry with enhanced scoring"""
        try:
            if not self.use_dynamodb:
                # Use in-memory storage
                self.leaderboard_storage.append(entry_data)
                print(f"✅ Leaderboard entry saved (in-memory): {entry_data['team_name']}")
                return True
            
            self.leaderboard_table.put_item(Item=entry_data)
            print(f"✅ Leaderboard entry saved: {entry_data['team_name']}")
            return True
        except Exception as e:
            print(f"❌ Error saving leaderboard entry: {e}")
            return False

# Global instance
dynamo_service = DynamoDBService() 
