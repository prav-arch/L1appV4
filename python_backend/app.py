import os
import json
import tempfile
import uuid
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import threading

# Import services
from services.storage import MemStorage
from services.log_parser import LogParser
from services.llm_service import LLMService
from services.milvus_service import MilvusService
from services.pcap_analyzer import PcapAnalyzer

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Create uploads directory if it doesn't exist
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize services
storage = MemStorage()
log_parser = LogParser()
llm_service = LLMService()
milvus_service = MilvusService()
pcap_analyzer = PcapAnalyzer()

# Background processing tasks
processing_tasks = {}

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get statistics for the dashboard"""
    try:
        stats = storage.get_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/activities', methods=['GET'])
def get_activities():
    """Get recent activities"""
    try:
        limit = request.args.get('limit', default=10, type=int)
        activities = storage.get_recent_activities(limit)
        return jsonify(activities)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/logs/upload', methods=['POST'])
def upload_log():
    """Upload a log file for analysis"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if not file.filename:
            return jsonify({"error": "No file selected"}), 400
        
        # Read file content
        content = file.read().decode('utf-8')
        
        # Validate file is a telecom log
        if not log_parser.is_valid_telecom_log(content):
            return jsonify({"error": "Invalid telecom log format"}), 400
        
        # Create log record
        log_data = {
            "filename": file.filename,
            "originalContent": content,
            "fileSize": len(content),
            "processingStatus": "pending"
        }
        
        log = storage.create_log(log_data)
        
        # Create activity record
        activity_data = {
            "logId": log["id"],
            "activityType": "upload",
            "description": f"Log '{file.filename}' uploaded",
            "status": "completed"
        }
        storage.create_activity(activity_data)
        
        # Start processing in background
        threading.Thread(target=process_log_file, args=(log["id"], content)).start()
        
        return jsonify({"id": log["id"]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/logs/<int:log_id>', methods=['GET'])
def get_log(log_id):
    """Get a specific log"""
    try:
        log = storage.get_log(log_id)
        if not log:
            return jsonify({"error": "Log not found"}), 404
        return jsonify(log)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/logs', methods=['GET'])
def get_logs():
    """Get all logs"""
    try:
        logs = storage.get_all_logs()
        return jsonify(logs)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/logs/<int:log_id>/analysis', methods=['GET'])
def get_analysis(log_id):
    """Get analysis result for a log"""
    try:
        analysis = storage.get_analysis_result_by_log_id(log_id)
        if not analysis:
            return jsonify({"error": "Analysis not found"}), 404
        return jsonify(analysis)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/search', methods=['POST'])
def search():
    """Semantic search in logs"""
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({"error": "No query provided"}), 400
        
        # Try vector search first
        try:
            # Generate embedding for query
            query_embedding = llm_service.generate_embedding(query)
            
            # Search for similar content in vector database
            search_results = milvus_service.search_similar_text(query_embedding)
            
            # Get log details for results
            enriched_results = []
            for result in search_results:
                log = storage.get_log(result["logId"])
                enriched_results.append({
                    "logId": result["logId"],
                    "filename": log["filename"] if log else "Unknown",
                    "text": result["text"],
                    "score": result["score"],
                    "relevance": "high" if result["score"] > 0.8 else "medium" if result["score"] > 0.6 else "low"
                })
            
            summary = llm_service.semantic_search(query, [r["text"] for r in search_results])
            
            return jsonify({
                "results": enriched_results,
                "summary": summary
            })
        
        except Exception as e:
            # Fall back to basic search if vector search fails
            logs = storage.get_all_logs()
            results = []
            
            for log in logs:
                if query.lower() in log["originalContent"].lower():
                    results.append({
                        "logId": log["id"],
                        "filename": log["filename"],
                        "text": log["originalContent"][:200] + "...",
                        "score": 0.5,  # Default score for basic search
                        "relevance": "medium"
                    })
            
            return jsonify({
                "results": results[:10],  # Limit to 10 results
                "summary": f"Found {len(results)} logs containing '{query}'"
            })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/analysis/<int:analysis_id>/status', methods=['PATCH'])
def update_status(analysis_id):
    """Update resolution status"""
    try:
        data = request.json
        status = data.get('status')
        
        if not status or status not in ['pending', 'in_progress', 'resolved']:
            return jsonify({"error": "Invalid status"}), 400
        
        result = storage.update_resolution_status(analysis_id, status)
        if not result:
            return jsonify({"error": "Analysis not found"}), 404
        
        # Create activity record
        activity_data = {
            "logId": result["logId"],
            "activityType": "status_change",
            "description": f"Analysis status changed to '{status}'",
            "status": "completed"
        }
        storage.create_activity(activity_data)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/pcap/upload', methods=['POST'])
def upload_pcap():
    """Upload a PCAP file for analysis"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if not file.filename:
            return jsonify({"error": "No file selected"}), 400
        
        # Check file extension
        if not file.filename.lower().endswith(('.pcap', '.pcapng', '.cap')):
            return jsonify({"error": "Invalid file format. Only PCAP files are supported."}), 400
        
        # Save file to disk temporarily
        filename = str(uuid.uuid4()) + '_' + file.filename
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)
        
        # Create log record for PCAP
        pcap_data = {
            "filename": file.filename,
            "originalContent": f"PCAP file saved at {file_path}",
            "fileSize": os.path.getsize(file_path),
            "processingStatus": "pending",
            "fileType": "pcap"
        }
        
        pcap_log = storage.create_log(pcap_data)
        
        # Create activity record
        activity_data = {
            "logId": pcap_log["id"],
            "activityType": "upload",
            "description": f"PCAP file '{file.filename}' uploaded",
            "status": "completed"
        }
        storage.create_activity(activity_data)
        
        # Start processing in background
        threading.Thread(target=process_pcap_file, args=(pcap_log["id"], file_path)).start()
        
        return jsonify({"id": pcap_log["id"], "message": "PCAP file uploaded successfully"})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/pcap/<int:pcap_id>/analysis', methods=['GET'])
def get_pcap_analysis(pcap_id):
    """Get PCAP analysis results"""
    try:
        analysis = storage.get_analysis_result_by_log_id(pcap_id)
        if not analysis:
            return jsonify({"error": "PCAP analysis not found"}), 404
        
        # For PCAP analysis, include additional telecom protocol info
        if "pcapData" in analysis and "file_path" in analysis["pcapData"]:
            file_path = analysis["pcapData"]["file_path"]
            if os.path.exists(file_path):
                telecom_stats = pcap_analyzer.extract_telecom_protocols(file_path)
                analysis["telecomStats"] = telecom_stats
        
        return jsonify(analysis)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/logs/<int:log_id>/root-cause-analysis', methods=['GET'])
def get_root_cause_analysis(log_id):
    """Get root cause analysis for a log"""
    try:
        log = storage.get_log(log_id)
        if not log:
            return jsonify({"error": "Log not found"}), 404
        
        analysis = storage.get_analysis_result_by_log_id(log_id)
        if not analysis:
            return jsonify({"error": "Analysis not found"}), 404
        
        # Perform deeper root cause analysis using LLM
        content = log.get("originalContent", "")
        issues = analysis.get("issues", [])
        
        root_causes = llm_service.perform_root_cause_analysis(content, issues)
        
        return jsonify(root_causes)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/prediction/potential-issues', methods=['GET'])
def predict_potential_issues():
    """Predict potential issues based on current log patterns"""
    try:
        # Get all logs
        logs = storage.get_all_logs()
        
        # Extract content from the most recent logs
        recent_logs_content = []
        for log in logs[:5]:  # Use the 5 most recent logs
            if log.get("fileType") != "pcap":  # Skip PCAP files
                recent_logs_content.append(log.get("originalContent", ""))
        
        # Use LLM to predict potential issues
        predictions = llm_service.predict_potential_issues(recent_logs_content)
        
        return jsonify(predictions)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/logs/<int:log_id>/timeline', methods=['GET'])
def get_log_timeline(log_id):
    """Get timeline analysis for a specific log"""
    try:
        log = storage.get_log(log_id)
        if not log:
            return jsonify({"error": "Log not found"}), 404
        
        # Extract and analyze timeline events
        timeline_events = log_parser.extract_timestamps(log.get("originalContent", ""))
        
        # Analyze events for significance
        enriched_timeline = llm_service.analyze_timeline_events(timeline_events, log_id)
        
        return jsonify(enriched_timeline)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/issues/<int:issue_id>/remediation', methods=['GET'])
def get_remediation_steps(issue_id):
    """Get detailed remediation steps for an issue"""
    try:
        # Find the analysis result containing this issue
        analysis_results = storage.get_all_analysis_results()
        target_analysis = None
        target_issue = None
        
        for analysis in analysis_results:
            for issue in analysis.get("issues", []):
                if issue.get("id") == issue_id:
                    target_analysis = analysis
                    target_issue = issue
                    break
            if target_analysis:
                break
        
        if not target_issue:
            return jsonify({"error": "Issue not found"}), 404
        
        # Get the associated log
        log = storage.get_log(target_analysis.get("logId"))
        if not log:
            return jsonify({"error": "Associated log not found"}), 404
        
        # Generate remediation steps
        remediation = llm_service.generate_remediation_steps(target_issue, log.get("originalContent", ""))
        
        return jsonify(remediation)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/natural-language-query', methods=['POST'])
def natural_language_query():
    """Process natural language queries about log data"""
    try:
        query = request.json.get('query')
        if not query:
            return jsonify({"error": "No query provided"}), 400
        
        # Get all logs for context
        logs = storage.get_all_logs()
        log_contents = [log.get('originalContent', '') for log in logs if log.get("fileType") != "pcap"]
        
        # Process the natural language query
        result = llm_service.process_natural_language_query(query, log_contents)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/issues/<int:issue_id>/feedback', methods=['POST'])
def submit_resolution_feedback(issue_id):
    """Submit feedback on resolution steps"""
    try:
        data = request.json
        was_successful = data.get('wasSuccessful')
        feedback = data.get('feedback', '')
        steps = data.get('steps', [])
        
        if was_successful is None:
            return jsonify({"error": "Missing required field: wasSuccessful"}), 400
        
        # Store feedback
        storage.store_resolution_feedback(issue_id, steps, was_successful, feedback)
        
        # Update the model with feedback if successful
        if was_successful:
            llm_service.train_on_resolution_history(storage.get_resolution_feedback())
        
        # Create activity record
        activity_data = {
            "activityType": "feedback",
            "description": f"Resolution feedback submitted: {'Successful' if was_successful else 'Unsuccessful'}",
            "status": "completed"
        }
        storage.create_activity(activity_data)
        
        return jsonify({"message": "Feedback submitted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def process_log_file(log_id, content):
    """Process log file in background"""
    try:
        # Update log status
        storage.update_log_status(log_id, "processing")
        
        # Create activity
        activity_data = {
            "logId": log_id,
            "activityType": "processing",
            "description": "Log processing started",
            "status": "in_progress"
        }
        activity = storage.create_activity(activity_data)
        
        # Analyze log with LLM
        analysis_result = llm_service.analyze_log(content)
        
        # Store analysis result
        result_data = {
            "logId": log_id,
            "issues": analysis_result["issues"],
            "recommendations": analysis_result["recommendations"],
            "summary": analysis_result["summary"],
            "severity": analysis_result["severity"],
            "resolutionStatus": "pending"
        }
        analysis = storage.create_analysis_result(result_data)
        
        # Segment log for embedding
        segments = log_parser.segment_log_for_embedding(content)
        
        try:
            # Generate embeddings
            embeddings = llm_service.generate_embeddings(segments)
            
            # Store embeddings in Milvus
            embedding_data = []
            for i, (segment, embedding) in enumerate(zip(segments, embeddings)):
                embedding_data.append({
                    "text": segment,
                    "embedding": embedding
                })
            
            milvus_service.insert_embeddings(log_id, embedding_data)
            
            # Update log status
            storage.update_log_status(log_id, "completed")
        except Exception as e:
            # If vector embedding fails, we still have the analysis
            print(f"Embedding generation failed: {str(e)}")
            storage.update_log_status(log_id, "completed_without_vectors")
        
        # Update activity
        activity_data = {
            "logId": log_id,
            "activityType": "analysis",
            "description": "Log analysis completed",
            "status": "completed"
        }
        storage.create_activity(activity_data)
        
    except Exception as e:
        print(f"Error processing log: {str(e)}")
        # Update log status to error
        storage.update_log_status(log_id, "error")
        
        # Update activity
        activity_data = {
            "logId": log_id,
            "activityType": "error",
            "description": f"Error processing log: {str(e)}",
            "status": "error"
        }
        storage.create_activity(activity_data)

def process_pcap_file(pcap_id, file_path):
    """Process PCAP file in background"""
    try:
        # Update log status
        storage.update_log_status(pcap_id, "processing")
        
        # Create activity
        activity_data = {
            "logId": pcap_id,
            "activityType": "processing",
            "description": "PCAP analysis started",
            "status": "in_progress"
        }
        storage.create_activity(activity_data)
        
        # Analyze PCAP file
        try:
            pcap_analysis = pcap_analyzer.analyze_pcap(file_path)
            
            # Generate a human-readable summary
            summary = pcap_analyzer.generate_pcap_summary(file_path, pcap_analysis)
            
            # Analyze the summary with LLM for recommendations
            llm_analysis = llm_service.analyze_log(summary)
            
            # Store telecom-specific stats
            telecom_stats = pcap_analyzer.extract_telecom_protocols(file_path)
            
            # Store analysis result
            result_data = {
                "logId": pcap_id,
                "issues": llm_analysis["issues"],
                "recommendations": llm_analysis["recommendations"],
                "summary": llm_analysis["summary"],
                "severity": llm_analysis["severity"],
                "resolutionStatus": "pending",
                "pcapData": {
                    "file_path": file_path,
                    "basic_stats": pcap_analysis["basic_stats"],
                    "protocol_stats": pcap_analysis["protocol_stats"],
                    "anomalies": pcap_analysis["anomalies"]
                }
            }
            analysis = storage.create_analysis_result(result_data)
            
            # Update log status
            storage.update_log_status(pcap_id, "completed")
            
            # Update activity
            activity_data = {
                "logId": pcap_id,
                "activityType": "analysis",
                "description": "PCAP analysis completed",
                "status": "completed"
            }
            storage.create_activity(activity_data)
            
        except Exception as e:
            print(f"Error analyzing PCAP: {str(e)}")
            # Store error analysis result
            result_data = {
                "logId": pcap_id,
                "issues": [{
                    "title": "PCAP Analysis Error",
                    "description": f"Error analyzing PCAP file: {str(e)}",
                    "severity": "high",
                    "firstOccurrence": datetime.now().isoformat(),
                    "status": "pending"
                }],
                "recommendations": [{
                    "title": "Try Different File Format",
                    "description": "Try converting the PCAP file to a different format or check if it's corrupted.",
                    "category": "other",
                    "isAutomaticallyResolved": False
                }],
                "summary": f"Failed to analyze PCAP file: {str(e)}",
                "severity": "high",
                "resolutionStatus": "pending"
            }
            storage.create_analysis_result(result_data)
            
            # Update log status
            storage.update_log_status(pcap_id, "error")
            
            # Update activity
            activity_data = {
                "logId": pcap_id,
                "activityType": "error",
                "description": f"Error analyzing PCAP: {str(e)}",
                "status": "error"
            }
            storage.create_activity(activity_data)
    
    except Exception as e:
        print(f"Error processing PCAP: {str(e)}")
        # Update log status to error
        storage.update_log_status(pcap_id, "error")
        
        # Update activity
        activity_data = {
            "logId": pcap_id,
            "activityType": "error",
            "description": f"Error processing PCAP: {str(e)}",
            "status": "error"
        }
        storage.create_activity(activity_data)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)