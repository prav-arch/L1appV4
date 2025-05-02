"""
Module for fine-tuning the local LLM on telecom-specific data.
"""
from typing import List, Dict, Any, Optional, Union
import os
import json
import logging
import datetime
import threading
import time
import random
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LLMFineTuningService:
    """Service for fine-tuning the local LLM on telecom-specific data"""
    
    def __init__(self):
        """Initialize the fine-tuning service"""
        # Create directory for storing fine-tuning datasets if it doesn't exist
        self.data_dir = Path("data/fine_tuning")
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # Directory to store fine-tuned models
        self.models_dir = Path("data/fine_tuned_models")
        self.models_dir.mkdir(parents=True, exist_ok=True)
        
        # Keep track of fine-tuning jobs
        self.jobs_file = self.data_dir / "fine_tuning_jobs.json"
        self.jobs = self._load_jobs()
        
        # Fine-tuning configuration
        self.default_config = {
            "learning_rate": 2e-5,
            "num_train_epochs": 3,
            "per_device_train_batch_size": 4,
            "gradient_accumulation_steps": 2,
            "warmup_steps": 50,
            "weight_decay": 0.01,
            "lora_r": 16,
            "lora_alpha": 32,
            "lora_dropout": 0.05,
        }
    
    def _load_jobs(self) -> List[Dict[str, Any]]:
        """Load fine-tuning jobs from the jobs file"""
        if self.jobs_file.exists():
            try:
                with open(self.jobs_file, 'r') as f:
                    return json.load(f)
            except json.JSONDecodeError:
                logger.error("Error decoding fine-tuning jobs file. Creating a new one.")
                return []
        return []
    
    def _save_jobs(self) -> None:
        """Save fine-tuning jobs to the jobs file"""
        with open(self.jobs_file, 'w') as f:
            json.dump(self.jobs, f, indent=2)
    
    def prepare_dataset_from_logs(self, log_contents: List[str], 
                                 analysis_results: List[Dict[str, Any]],
                                 dataset_name: str) -> Dict[str, Any]:
        """
        Prepare a fine-tuning dataset from parsed logs and their analysis results
        
        Args:
            log_contents: List of log contents
            analysis_results: List of analysis results corresponding to each log
            dataset_name: Name of the dataset
            
        Returns:
            Dictionary with dataset information
        """
        if len(log_contents) != len(analysis_results):
            raise ValueError("The number of logs and analysis results must match")
        
        # Create a unique dataset ID
        dataset_id = f"telecom_dataset_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Create a list of training examples in the format expected by the fine-tuning API
        training_examples = []
        
        for log, analysis in zip(log_contents, analysis_results):
            # Create system prompt
            system_prompt = "You are a telecom log analysis assistant. Analyze the provided log for issues and recommend solutions."
            
            # Create user message with the log content
            user_message = f"Please analyze this telecom log file and identify any issues:\n\n{log}"
            
            # Create assistant message with the analysis result
            # Format the analysis as a structured response
            issues = analysis.get("issues", [])
            recommendations = analysis.get("recommendations", [])
            
            assistant_message = "Based on the telecom log analysis:\n\n"
            
            # Add issues
            assistant_message += "Issues found:\n"
            for i, issue in enumerate(issues, 1):
                issue_text = issue.get("description", "Unknown issue")
                severity = issue.get("severity", "medium")
                assistant_message += f"{i}. {issue_text} (Severity: {severity})\n"
            
            # Add recommendations
            assistant_message += "\nRecommendations:\n"
            for i, recommendation in enumerate(recommendations, 1):
                rec_text = recommendation.get("description", "No recommendation available")
                assistant_message += f"{i}. {rec_text}\n"
            
            # Create the training example
            training_example = {
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                    {"role": "assistant", "content": assistant_message}
                ]
            }
            
            training_examples.append(training_example)
        
        # Save the dataset to a file
        dataset_file = self.data_dir / f"{dataset_id}.json"
        with open(dataset_file, 'w') as f:
            json.dump(training_examples, f, indent=2)
        
        # Record the dataset information
        dataset_info = {
            "id": dataset_id,
            "name": dataset_name,
            "file_path": str(dataset_file),
            "num_examples": len(training_examples),
            "created_at": datetime.datetime.now().isoformat(),
            "status": "created"
        }
        
        logger.info(f"Created fine-tuning dataset: {dataset_id} with {len(training_examples)} examples")
        
        return dataset_info
    
    def start_fine_tuning(self, dataset_id: str, 
                         model_name: str = "llama-3.1-8b-local", 
                         config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Start a fine-tuning job for the specified dataset
        
        Args:
            dataset_id: ID of the dataset to use for fine-tuning
            model_name: Name of the base model to fine-tune
            config: Fine-tuning configuration parameters (optional)
            
        Returns:
            Dictionary with job information
        """
        # Find the dataset
        dataset_file = self.data_dir / f"{dataset_id}.json"
        if not dataset_file.exists():
            raise FileNotFoundError(f"Dataset file not found: {dataset_file}")
        
        # Create a unique job ID
        job_id = f"fine_tuning_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Merge the provided config with the default config
        job_config = self.default_config.copy()
        if config:
            job_config.update(config)
        
        # Load dataset to get example count
        try:
            with open(dataset_file, 'r') as f:
                dataset = json.load(f)
                example_count = len(dataset)
        except Exception as e:
            logger.error(f"Error reading dataset: {str(e)}")
            example_count = 0
        
        # Create the job information
        job_info = {
            "id": job_id,
            "dataset_id": dataset_id,
            "model_name": model_name,
            "config": job_config,
            "status": "pending",
            "created_at": datetime.datetime.now().isoformat(),
            "started_at": None,
            "completed_at": None,
            "output_model_name": f"{model_name}_ft_{job_id}",
            "metrics": {},
            "progress": {
                "current_epoch": 0,
                "total_epochs": job_config.get("num_train_epochs", 3),
                "current_step": 0,
                "total_steps": example_count * job_config.get("num_train_epochs", 3),
                "percentage_complete": 0,
                "estimated_time_remaining": "Unknown",
                "loss": None,
                "example_count": example_count,
                "last_updated": datetime.datetime.now().isoformat()
            },
            "logs": [
                {
                    "timestamp": datetime.datetime.now().isoformat(),
                    "message": "Job created and queued for processing"
                }
            ]
        }
        
        # Add the job to the list of jobs
        self.jobs.append(job_info)
        self._save_jobs()
        
        # In a real implementation, this would start the fine-tuning process
        # using the appropriate LLM API for fine-tuning
        # For now, we'll simulate the process
        logger.info(f"Started fine-tuning job: {job_id}")
        
        # Simulate starting the job
        job_info["status"] = "running"
        job_info["started_at"] = datetime.datetime.now().isoformat()
        job_info["logs"].append({
            "timestamp": datetime.datetime.now().isoformat(),
            "message": "Fine-tuning process started"
        })
        self._save_jobs()
        
        # Start a background thread to simulate job progress
        if not os.environ.get("DISABLE_SIMULATED_PROGRESS", False):
            threading.Thread(target=self._simulate_job_progress, args=(job_id,)).start()
        
        return job_info
        
    def _simulate_job_progress(self, job_id: str) -> None:
        """
        Simulate progress updates for a fine-tuning job (for development purposes)
        
        Args:
            job_id: ID of the fine-tuning job
        """
        job = self.get_fine_tuning_job(job_id)
        if not job:
            return
            
        # Get total steps and epochs for simulation
        total_epochs = job["progress"]["total_epochs"]
        total_steps = job["progress"]["total_steps"]
        example_count = job["progress"]["example_count"]
        
        # Simulate progress over time
        for epoch in range(1, total_epochs + 1):
            if job["status"] != "running":
                # Job may have been cancelled or failed
                break
                
            # Update epoch progress
            job["progress"]["current_epoch"] = epoch
            job["logs"].append({
                "timestamp": datetime.datetime.now().isoformat(),
                "message": f"Starting epoch {epoch}/{total_epochs}"
            })
            
            # Simulate steps within the epoch
            steps_per_epoch = total_steps // total_epochs if total_epochs > 0 else 100
            for step in range(1, steps_per_epoch + 1):
                time.sleep(0.1)  # Simulate processing time
                
                # Check if job is still running
                current_job = self.get_fine_tuning_job(job_id)
                if not current_job or current_job["status"] != "running":
                    return
                
                # Calculate overall progress
                current_step = (epoch - 1) * steps_per_epoch + step
                percentage = min(99, int((current_step / total_steps) * 100)) if total_steps > 0 else 0
                
                # Simulate decreasing loss
                base_loss = 0.5 - (0.4 * (current_step / total_steps)) if total_steps > 0 else 0.1
                random_factor = random.uniform(-0.05, 0.05)
                current_loss = max(0.05, base_loss + random_factor)
                
                # Update progress metrics
                job["progress"]["current_step"] = current_step
                job["progress"]["percentage_complete"] = percentage
                job["progress"]["loss"] = round(current_loss, 4)
                job["progress"]["last_updated"] = datetime.datetime.now().isoformat()
                
                # Calculate estimated time remaining
                elapsed_time = (datetime.datetime.now() - datetime.datetime.fromisoformat(job["started_at"])).total_seconds()
                if current_step > 0:
                    time_per_step = elapsed_time / current_step
                    steps_remaining = total_steps - current_step
                    eta_seconds = time_per_step * steps_remaining
                    
                    # Format time remaining
                    if eta_seconds < 60:
                        eta = f"{int(eta_seconds)} seconds"
                    elif eta_seconds < 3600:
                        eta = f"{int(eta_seconds / 60)} minutes"
                    else:
                        eta = f"{int(eta_seconds / 3600)} hours, {int((eta_seconds % 3600) / 60)} minutes"
                    
                    job["progress"]["estimated_time_remaining"] = eta
                
                # Add log entries at key points
                if step == 1 or step % (steps_per_epoch // 4) == 0 or step == steps_per_epoch:
                    job["logs"].append({
                        "timestamp": datetime.datetime.now().isoformat(),
                        "message": f"Epoch {epoch}/{total_epochs}, Step {step}/{steps_per_epoch}, Loss: {current_loss:.4f}"
                    })
                
                # Save progress
                self._save_jobs()
        
        # Complete the job
        job["status"] = "completed"
        job["completed_at"] = datetime.datetime.now().isoformat()
        job["progress"]["percentage_complete"] = 100
        job["progress"]["current_epoch"] = total_epochs
        job["progress"]["current_step"] = total_steps
        job["progress"]["estimated_time_remaining"] = "0 seconds"
        
        # Add final metrics
        job["metrics"] = {
            "train_loss": job["progress"]["loss"],
            "eval_loss": max(0.05, job["progress"]["loss"] * random.uniform(0.9, 1.1)),
            "train_runtime": (datetime.datetime.fromisoformat(job["completed_at"]) - 
                             datetime.datetime.fromisoformat(job["started_at"])).total_seconds(),
            "train_samples_per_second": example_count / ((datetime.datetime.fromisoformat(job["completed_at"]) - 
                                                      datetime.datetime.fromisoformat(job["started_at"])).total_seconds()),
            "epoch": float(total_epochs)
        }
        
        # Add completion log
        job["logs"].append({
            "timestamp": datetime.datetime.now().isoformat(),
            "message": f"Fine-tuning completed successfully. Final loss: {job['metrics']['train_loss']:.4f}"
        })
        
        self._save_jobs()
    
    def get_fine_tuning_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a fine-tuning job
        
        Args:
            job_id: ID of the fine-tuning job
            
        Returns:
            Dictionary with job information, or None if not found
        """
        for job in self.jobs:
            if job["id"] == job_id:
                return job
        return None
    
    def get_all_fine_tuning_jobs(self) -> List[Dict[str, Any]]:
        """
        Get information about all fine-tuning jobs
        
        Returns:
            List of dictionaries with job information
        """
        return self.jobs
    
    def simulate_job_completion(self, job_id: str, success: bool = True) -> Optional[Dict[str, Any]]:
        """
        Simulate the completion of a fine-tuning job (for development purposes)
        
        Args:
            job_id: ID of the fine-tuning job
            success: Whether the job succeeded or failed
            
        Returns:
            Updated job information, or None if not found
        """
        job = self.get_fine_tuning_job(job_id)
        if not job:
            return None
        
        if success:
            job["status"] = "completed"
            job["metrics"] = {
                "train_loss": 0.1234,
                "eval_loss": 0.2345,
                "train_runtime": 1200,
                "train_samples_per_second": 8.0,
                "epoch": 3.0
            }
        else:
            job["status"] = "failed"
            job["error"] = "Simulated failure"
        
        job["completed_at"] = datetime.datetime.now().isoformat()
        self._save_jobs()
        
        return job
    
    def get_available_fine_tuned_models(self) -> List[Dict[str, Any]]:
        """
        Get a list of available fine-tuned models
        
        Returns:
            List of dictionaries with model information
        """
        fine_tuned_models = []
        
        for job in self.jobs:
            if job["status"] == "completed":
                model_info = {
                    "id": job["output_model_name"],
                    "base_model": job["model_name"],
                    "fine_tuned_from_dataset": job["dataset_id"],
                    "created_at": job["completed_at"],
                    "job_id": job["id"]
                }
                fine_tuned_models.append(model_info)
        
        return fine_tuned_models

# Create an instance of the service
fine_tuning_service = LLMFineTuningService()