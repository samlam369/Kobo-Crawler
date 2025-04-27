pipeline {
    agent any
    environment {
        CHROME_BIN = '/usr/bin/google-chrome' // Set as needed for Jenkins slave
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }
        stage('Run Kobo Crawler') {
            steps {
                // Set LOAD_IMAGES=false to disable image loading if desired
                sh 'node dothething.js'
            }
        }
    }
    post {
        always {
            archiveArtifacts artifacts: 'output*.json', allowEmptyArchive: true
        }
        failure {
            echo 'Build failed! Check the logs for details.'
        }
    }
}
