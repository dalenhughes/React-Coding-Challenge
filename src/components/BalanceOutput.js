import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import * as utils from '../utils';

class BalanceOutput extends Component {
  render() {
    if (!this.props.userInput.format) {
      return null;
    }

    return (
      <div className='output'>
        <p>
          Total Debit: {this.props.totalDebit} Total Credit: {this.props.totalCredit}
          <br />
          Balance from account {this.props.userInput.startAccount || '*'}
          {' '}
          to {this.props.userInput.endAccount || '*'}
          {' '}
          from period {utils.dateToString(this.props.userInput.startPeriod)}
          {' '}
          to {utils.dateToString(this.props.userInput.endPeriod)}
        </p>
        {this.props.userInput.format === 'CSV' ? (
          <pre>{utils.toCSV(this.props.balance)}</pre>
        ) : null}
        {this.props.userInput.format === 'HTML' ? (
          <table className="table">
            <thead>
              <tr>
                <th>ACCOUNT</th>
                <th>DESCRIPTION</th>
                <th>DEBIT</th>
                <th>CREDIT</th>
                <th>BALANCE</th>
              </tr>
            </thead>
            <tbody>
              {this.props.balance.map((entry, i) => (
                <tr key={i}>
                  <th scope="row">{entry.ACCOUNT}</th>
                  <td>{entry.DESCRIPTION}</td>
                  <td>{entry.DEBIT}</td>
                  <td>{entry.CREDIT}</td>
                  <td>{entry.BALANCE}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    );
  }
}

BalanceOutput.propTypes = {
  balance: PropTypes.arrayOf(
    PropTypes.shape({
      ACCOUNT: PropTypes.number.isRequired,
      DESCRIPTION: PropTypes.string.isRequired,
      DEBIT: PropTypes.number.isRequired,
      CREDIT: PropTypes.number.isRequired,
      BALANCE: PropTypes.number.isRequired
    })
  ).isRequired,
  totalCredit: PropTypes.number.isRequired,
  totalDebit: PropTypes.number.isRequired,
  userInput: PropTypes.shape({
    startAccount: PropTypes.number,
    endAccount: PropTypes.number,
    startPeriod: PropTypes.date,
    endPeriod: PropTypes.date,
    format: PropTypes.string
  }).isRequired
};

export default connect(state => {
  let balance = [];
  let { startAccount, endAccount, startPeriod, endPeriod} = state.userInput;
  // Reduce the accounts to a dictionary for easy lookup later
  let accountDescriptions = state.accounts.reduce((acc, { ACCOUNT, LABEL }) => {
    acc[ACCOUNT] = LABEL;
    return acc;
  }, {})

  // Filter relevant journal entries
  balance = state.journalEntries.filter(entry => { 
    // Do nothing if '*' entered for startAccount
    if (Number.isNaN(startAccount)) {
      // Do nothing
    // Exclude entries less than or equal to the start account
    } else if (startAccount && entry.ACCOUNT <= startAccount) {
      return false
    }

    // Do nothing if '*' entered for endAccount
    if (Number.isNaN(endAccount)) {
      // Do nothing
    // Exclude entries greater than or equal to the start account
    } else if (endAccount && entry.ACCOUNT >= endAccount) {
      return false;
    }
    // Do nothing if '*' entered for startPeriod
    if (startPeriod.toString() === 'Invalid Date') {
      // Do nothing
    // Exclude entries less than or equal to the start period
    } else if (startPeriod && entry.PERIOD <= startPeriod) {
      return false;
    }

    // Do nothing if '*' entered for endPeriod
    if (endPeriod.toString() === 'Invalid Date') {
      // Do nothing
    // Exclude entries greater than or equal to the end period
    } else if (endPeriod && entry.PERIOD >= endPeriod) {
      return false;
    }

    return true;
  })
  // Sort by account number
  .sort((a,b) => a.ACCOUNT - b.ACCOUNT)
  // Add description metadata from accounts and compute balance
  .map( entry => {
     return {
       ACCOUNT: entry.ACCOUNT,
       DESCRIPTION: accountDescriptions[entry.ACCOUNT] || 'N/A',
       DEBIT: entry.DEBIT,
       CREDIT: entry.CREDIT,
       BALANCE: entry.DEBIT - entry.CREDIT
     }
  })
  // Combine multiple entries for the same account
  .reduce((acc, value) => {
    const fIndex = acc.findIndex(v => v.ACCOUNT === value.ACCOUNT);
    if (fIndex >= 0) {
      acc[fIndex] = { 
        ACCOUNT: acc[fIndex].ACCOUNT,
        DESCRIPTION: acc[fIndex].DESCRIPTION,
        DEBIT: acc[fIndex].DEBIT + value.DEBIT,
        CREDIT: acc[fIndex].CREDIT + value.CREDIT,
        BALANCE:  acc[fIndex].BALANCE + value.BALANCE
      }
    } else {
      acc.push(value);
    }
    return acc;
  }, [])

  const totalCredit = balance.reduce((acc, entry) => acc + entry.CREDIT, 0);
  const totalDebit = balance.reduce((acc, entry) => acc + entry.DEBIT, 0);

  return {
    balance,
    totalCredit,
    totalDebit,
    userInput: state.userInput
  };
})(BalanceOutput);

